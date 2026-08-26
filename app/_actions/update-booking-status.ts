"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface UpdateBookingStatusParams {
  bookingId: string;
  status: BookingStatus;
}

export const updateBookingStatus = async ({
  bookingId,
  status,
}: UpdateBookingStatusParams) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  const booking = await db.booking.findUnique({
    where: {
      id: bookingId,
    },
  });

  if (!booking) {
    throw new Error("Agendamento não encontrado.");
  }

  await db.booking.update({
    where: {
      id: bookingId,
    },
    data: {
      status,
    },
  });

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/");

  return {
    success: true,
  };
};
