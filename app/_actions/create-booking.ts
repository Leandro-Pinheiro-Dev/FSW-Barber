"use server";

import { db } from "@/lib/prisma";

interface CreateBookingParams {
  userId: string;
  serviceId: string;
  date: Date;
}

export const createBooking = async (params: CreateBookingParams) => {
  console.log("Criando reserva:", params);

  await db.booking.create({
    data: params,
  });
};
