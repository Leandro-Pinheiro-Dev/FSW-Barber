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
  // VALIDAR DATA
  //
  // Esperamos:
  // YYYY-MM-DD
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
  // VALIDAR DATA
  // =====================================================

  const validationDate = new Date(Date.UTC(year, month - 1, day));

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    console.error("DATA INVÁLIDA:", date);
    throw new Error("Data inválida para consultar a agenda.");
  }

  // =====================================================
  // DIA DA SEMANA
  //
  // Criamos a data considerando Brasília (UTC-3).
  // =====================================================

  const brazilDate = new Date(`${date}T12:00:00-03:00`);

  const dayOfWeek = brazilDate.getUTCDay();

  // =====================================================
  // INÍCIO DO DIA NO BRASIL
  // =====================================================

  const startOfDay = new Date(`${date}T00:00:00-03:00`);

  // =====================================================
  // FINAL DO DIA NO BRASIL
  // =====================================================

  const endOfDay = new Date(`${date}T23:59:59.999-03:00`);

  console.log("=================================");
  console.log("AGENDA");
  console.log("DATA RECEBIDA:", date);
  console.log("INÍCIO:", startOfDay);
  console.log("FINAL:", endOfDay);
  console.log("DIA DA SEMANA:", dayOfWeek);
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

      status: {
        not: "CANCELLED",
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
