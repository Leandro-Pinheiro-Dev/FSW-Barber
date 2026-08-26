"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface CompleteBookingParams {
  bookingId: string;
  paymentType: "PAID" | "DEBT";
}

export const completeBooking = async ({
  bookingId,
  paymentType,
}: CompleteBookingParams) => {
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
    include: {
      service: true,
    },
  });

  if (!booking) {
    throw new Error("Agendamento não encontrado.");
  }

  // Evita processar o mesmo agendamento duas vezes
  if (booking.status === "COMPLETED") {
    throw new Error("Este agendamento já foi concluído.");
  }

  // =====================================================
  // CONCLUIR AGENDAMENTO
  // =====================================================

  await db.booking.update({
    where: {
      id: bookingId,
    },
    data: {
      status: "COMPLETED",
    },
  });

  // =====================================================
  // CRIAR FIADO
  // =====================================================

  if (paymentType === "DEBT") {
    await db.customerDebt.create({
      data: {
        userId: booking.userId,
        bookingId: booking.id,
        amount: booking.service.price,
        type: "DEBT",
        description: `Fiado - ${booking.service.name}`,
      },
    });
  }

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/");

  return {
    success: true,
  };
};
