"use server";

import { db } from "@/lib/prisma";
import { endOfDay, startOfDay } from "date-fns";

interface GetBookingsProps {
  serviceId: string;
  date: Date;
}

export async function getBookings({ serviceId, date }: GetBookingsProps) {
  return await db.booking.findMany({
    where: {
      serviceId,
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
    },
  });
}
