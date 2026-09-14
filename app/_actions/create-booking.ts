"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

interface CreateBookingParams {
  serviceId: string;
  date: string;
  time: string;
  userId?: string;
}

export const createBooking = async ({
  serviceId,
  date,
  time,
  userId,
}: CreateBookingParams) => {
  // =====================================================
  // 1. AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // 2. DEFINIR O CLIENTE
  // =====================================================

  const bookingUserId =
    session.user.role === "BARBER" && userId ? userId : session.user.id;

  // =====================================================
  // 3. VALIDAR DATA
  // =====================================================

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data inválida.");
  }

  // =====================================================
  // 4. VALIDAR HORÁRIO
  // =====================================================

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Horário inválido.");
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Horário inválido.");
  }

  // =====================================================
  // 5. VERIFICAR SERVIÇO
  // =====================================================

  const service = await db.barbershopService.findUnique({
    where: {
      id: serviceId,
    },
  });

  if (!service) {
    throw new Error("Serviço não encontrado.");
  }

  // =====================================================
  // 6. DIA DA SEMANA
  //
  // Usamos explicitamente o horário de Brasília.
  // Isso evita depender do timezone do servidor.
  // =====================================================

  const selectedDate = new Date(`${date}T00:00:00-03:00`);

  if (Number.isNaN(selectedDate.getTime())) {
    throw new Error("Data inválida.");
  }

  // Para descobrir o dia da semana corretamente no Brasil,
  // usamos a data original sem depender do timezone do servidor.
  const [year, month, day] = date.split("-").map(Number);

  const brazilDate = new Date(Date.UTC(year, month - 1, day, 3, 0, 0));

  const dayOfWeek = brazilDate.getUTCDay();

  console.log("=================================");
  console.log("NOVO AGENDAMENTO");
  console.log("DATA:", date);
  console.log("HORÁRIO:", time);
  console.log("DIA DA SEMANA:", dayOfWeek);
  console.log("SERVIÇO:", serviceId);
  console.log("=================================");

  // =====================================================
  // 7. VERIFICAR HORÁRIO FIXO
  // =====================================================

  const fixedSchedule = await db.fixedSchedule.findFirst({
    where: {
      barbershopId: service.barbershopId,
      dayOfWeek,
      time,
      active: true,
    },
  });

  if (fixedSchedule) {
    throw new Error(
      `Este horário já está reservado para ${fixedSchedule.clientName}.`,
    );
  }

  // =====================================================
  // 8. CRIAR DATA NO HORÁRIO DE BRASÍLIA
  //
  // IMPORTANTE:
  // -03:00 = horário de Brasília
  //
  // Exemplo:
  // 2026-09-18 15:00 Brasil
  // será armazenado como:
  // 2026-09-18T18:00:00.000Z
  // =====================================================

  const bookingDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Não foi possível criar a data do agendamento.");
  }

  // =====================================================
  // 9. VERIFICAR SE O HORÁRIO JÁ ESTÁ OCUPADO
  // =====================================================

  const slotStart = new Date(bookingDate);

  slotStart.setSeconds(0, 0);

  const slotEnd = new Date(slotStart);

  slotEnd.setMinutes(slotEnd.getMinutes() + 1);

  const existingBooking = await db.booking.findFirst({
    where: {
      date: {
        gte: slotStart,
        lt: slotEnd,
      },

      status: {
        not: "CANCELLED",
      },
    },
  });

  if (existingBooking) {
    throw new Error("Este horário já está reservado por outro cliente.");
  }

  // =====================================================
  // 10. CRIAR AGENDAMENTO
  // =====================================================

  const booking = await db.booking.create({
    data: {
      userId: bookingUserId,
      serviceId,
      date: bookingDate,
      status: "PENDING",
    },
  });

  console.log("=================================");
  console.log("AGENDAMENTO CRIADO");
  console.log("ID:", booking.id);
  console.log("CLIENTE:", bookingUserId);
  console.log("DATA:", booking.date);
  console.log("STATUS:", booking.status);
  console.log("=================================");

  // =====================================================
  // 11. ATUALIZAR CACHE
  // =====================================================

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/barbeiro/dashboard");

  return {
    success: true,
    bookingId: booking.id,
  };
};
