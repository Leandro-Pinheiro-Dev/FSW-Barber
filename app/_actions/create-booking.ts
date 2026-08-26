"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

interface CreateBookingParams {
  serviceId: string;
  date: Date;
  userId?: string;
}

export const createBooking = async ({
  serviceId,
  date,
  userId,
}: CreateBookingParams) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // DEFINIR O CLIENTE
  // =====================================================

  const bookingUserId =
    session.user.role === "BARBER" && userId ? userId : session.user.id;

  // =====================================================
  // VERIFICAR SERVIÇO
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
  // DIA DA SEMANA E HORÁRIO
  // =====================================================

  const dayOfWeek = date.getDay();
  const time = format(date, "HH:mm");

  // =====================================================
  // VERIFICAR HORÁRIO FIXO
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
  // VERIFICAR OUTRO AGENDAMENTO
  // =====================================================

  const existingBooking = await db.booking.findFirst({
    where: {
      date,
    },
  });

  if (existingBooking) {
    throw new Error("Este horário já está agendado.");
  }

  // =====================================================
  // CRIAR AGENDAMENTO
  // =====================================================

  await db.booking.create({
    data: {
      userId: bookingUserId,
      serviceId,
      date,
      status: "PENDING",
    },
  });

  // =====================================================
  // ATUALIZAR PÁGINAS
  // =====================================================

  revalidatePath("/");
  revalidatePath("/barbeiro/dashboard");

  return {
    success: true,
  };
};
