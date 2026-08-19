"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

interface CreateBookingParams {
  serviceId: string;
  date: Date;
}

export const createBooking = async (params: CreateBookingParams) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado");
  }

  console.log("Criando reserva:", {
    ...params,
    userId: session.user.id,
  });

  await db.booking.create({
    data: {
      ...params,
      userId: session.user.id,
    },
  });

  revalidatePath("/barbershops/[id]");
};
