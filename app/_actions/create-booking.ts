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

  const selectedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(selectedDate.getTime())) {
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
  // JavaScript:
  // 0 = Domingo
  // 1 = Segunda
  // 2 = Terça
  // 3 = Quarta
  // 4 = Quinta
  // 5 = Sexta
  // 6 = Sábado
  // =====================================================

  const dayOfWeek = selectedDate.getDay();

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
  // 8. CRIAR DATA DO AGENDAMENTO
  //
  // A data é criada no servidor usando a data escolhida
  // e o horário enviado separadamente.
  // =====================================================

  const bookingDate = new Date(`${date}T${time}:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Não foi possível criar a data do agendamento.");
  }

  // =====================================================
  // 9. VERIFICAR OUTRO AGENDAMENTO
  // =====================================================

  const existingBooking = await db.booking.findFirst({
    where: {
      date: bookingDate,
    },
  });

  if (existingBooking) {
    throw new Error("Este horário já está agendado.");
  }

  // =====================================================
  // 10. CRIAR AGENDAMENTO
  // =====================================================

  await db.booking.create({
    data: {
      userId: bookingUserId,
      serviceId,
      date: bookingDate,
      status: "PENDING",
    },
  });

  // =====================================================
  // 11. ATUALIZAR CACHE
  // =====================================================

  revalidatePath("/");
  revalidatePath("/barbeiro/dashboard");

  return {
    success: true,
  };
};
