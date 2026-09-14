"use server";

import { db } from "@/lib/prisma";

interface GetBookingsProps {
  date: Date;
}

export async function getBookings({ date }: GetBookingsProps) {
  // =====================================================
  // PEGAR A DATA ESCOLHIDA PELO CLIENTE
  // =====================================================

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const dateString = `${year}-${month}-${day}`;

  // =====================================================
  // HORÁRIO DE BRASÍLIA
  //
  // O Vercel pode estar em UTC.
  // Por isso informamos explicitamente -03:00.
  // =====================================================

  const startOfDay = new Date(`${dateString}T00:00:00-03:00`);

  const endOfDay = new Date(`${dateString}T23:59:59.999-03:00`);

  console.log("=================================");
  console.log("BUSCANDO AGENDAMENTOS");
  console.log("DATA:", dateString);
  console.log("INÍCIO:", startOfDay);
  console.log("FINAL:", endOfDay);
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
  });
}
