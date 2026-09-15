"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";

interface GetBookingsProps {
  date: Date;
}

export async function getBookings({ date }: GetBookingsProps) {
  // =====================================================
  // DATA DO CALENDÁRIO
  // =====================================================
  //
  // A data do agendamento é interpretada como calendário
  // brasileiro.
  //
  // =====================================================

  const dateString = date.toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  // =====================================================
  // INÍCIO E FINAL DO DIA EM SÃO PAULO
  // =====================================================

  const startOfDay = new Date(`${dateString}T00:00:00-03:00`);

  const endOfDay = new Date(`${dateString}T23:59:59.999-03:00`);

  console.log("=================================");
  console.log("BUSCANDO AGENDAMENTOS");
  console.log("DATA:", dateString);
  console.log("INÍCIO:", startOfDay.toISOString());
  console.log("FINAL:", endOfDay.toISOString());
  console.log("=================================");

  // =====================================================
  // BUSCAR AGENDAMENTOS
  // =====================================================

  return await db.booking.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },

      status: {
        not: "CANCELLED",
      },
    },

    orderBy: {
      date: "asc",
    },

    include: {
      bookingItems: {
        include: {
          service: true,
        },
      },

      service: true,
    } satisfies Prisma.BookingInclude,
  });
}
