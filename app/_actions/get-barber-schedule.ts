"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const getBarberSchedule = async (date: string) => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // VERIFICAR BARBEIRO
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso permitido somente ao barbeiro.");
  }

  // =====================================================
  // VALIDAR DATA RECEBIDA
  // Esperamos: YYYY-MM-DD
  // =====================================================

  if (!date || typeof date !== "string") {
    throw new Error("Data não informada.");
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    console.error("DATA RECEBIDA:", date);
    throw new Error("Formato de data inválido.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // =====================================================
  // CRIAR DATA LOCAL
  // =====================================================

  const selectedDate = new Date(year, month - 1, day);

  // Verificação extra para datas impossíveis
  // Exemplo: 2026-02-31
  if (
    selectedDate.getFullYear() !== year ||
    selectedDate.getMonth() !== month - 1 ||
    selectedDate.getDate() !== day
  ) {
    console.error("DATA INVÁLIDA:", date);

    throw new Error("Data inválida para consultar a agenda.");
  }

  // =====================================================
  // INÍCIO DO DIA
  // =====================================================

  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);

  // =====================================================
  // FINAL DO DIA
  // =====================================================

  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  console.log("=================================");
  console.log("AGENDA");
  console.log("DATA RECEBIDA:", date);
  console.log("DATA LOCAL:", selectedDate);
  console.log("INÍCIO:", startOfDay);
  console.log("FINAL:", endOfDay);
  console.log("DIA DA SEMANA:", selectedDate.getDay());
  console.log("=================================");

  // =====================================================
  // BUSCAR AGENDAMENTOS
  // =====================================================

  const bookings = await db.booking.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },

    include: {
      user: true,
      service: true,
    },

    orderBy: {
      date: "asc",
    },
  });

  // =====================================================
  // BUSCAR HORÁRIOS FIXOS
  // =====================================================

  const dayOfWeek = selectedDate.getDay();

  const fixedSchedules = await db.fixedSchedule.findMany({
    where: {
      dayOfWeek,
      active: true,
    },

    orderBy: {
      time: "asc",
    },
  });

  // =====================================================
  // FORMATAR AGENDAMENTOS
  // =====================================================

  const formattedBookings = bookings.map((booking) => ({
    id: booking.id,
    userId: booking.userId,
    serviceId: booking.serviceId,
    date: booking.date,

    clientName:
      booking.clientName ??
      booking.user?.name ??
      booking.user?.email ??
      "Cliente",

    serviceName: booking.service.name,
    status: booking.status,
  }));
  // =====================================================
  // RETORNAR
  // =====================================================

  return {
    bookings: formattedBookings,

    fixedSchedules: fixedSchedules.map((schedule) => ({
      id: schedule.id,
      time: schedule.time,
      clientName: schedule.clientName,
    })),
  };
};
