"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

interface CreateBookingByBarberParams {
  serviceId: string;
  date: Date;
  userId?: string;
  clientName?: string;
  clientPhone?: string;
}

export const createBookingByBarber = async ({
  serviceId,
  date,
  userId,
  clientName,
  clientPhone,
}: CreateBookingByBarberParams) => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // SOMENTE BARBEIRO PODE CRIAR AGENDAMENTO PELO PAINEL
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Apenas o barbeiro pode criar agendamentos.");
  }

  // =====================================================
  // VALIDAR SERVIÇO
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
  // DEFINIR TIPO DE CLIENTE
  // =====================================================

  const hasRegisteredClient = Boolean(userId);
  const hasManualClient = Boolean(clientName?.trim());

  if (!hasRegisteredClient && !hasManualClient) {
    throw new Error("Selecione um cliente ou informe o cliente manualmente.");
  }

  if (hasRegisteredClient && hasManualClient) {
    throw new Error("Escolha apenas um tipo de cliente: cadastrado ou manual.");
  }

  // =====================================================
  // CLIENTE CADASTRADO
  // =====================================================

  if (userId) {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error("Cliente cadastrado não encontrado.");
    }
  }

  // =====================================================
  // CLIENTE MANUAL
  // =====================================================

  const normalizedClientName = clientName?.trim() || null;

  const normalizedClientPhone = clientPhone?.trim() || null;

  if (hasManualClient && !normalizedClientName) {
    throw new Error("Informe o nome do cliente.");
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
      status: {
        not: "CANCELLED",
      },
    },
  });

  if (existingBooking) {
    const existingClient = existingBooking.clientName || "outro cliente";

    throw new Error(`Este horário já está agendado para ${existingClient}.`);
  }

  // =====================================================
  // CRIAR AGENDAMENTO
  // =====================================================

  await db.booking.create({
    data: {
      userId: userId || null,
      clientName: normalizedClientName,
      clientPhone: normalizedClientPhone,
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
