"use server";

import { db } from "@/lib/prisma";
import { endOfDay, startOfDay } from "date-fns";

interface GetBookingsProps {
  date: Date;
}

export async function getBookings({ date }: GetBookingsProps) {
  return await db.booking.findMany({
    where: {
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
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
