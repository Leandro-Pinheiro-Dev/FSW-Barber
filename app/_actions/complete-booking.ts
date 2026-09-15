"use server";

import { getServerSession } from "next-auth";

import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";

interface CompleteBookingParams {
  bookingId: string;
  paymentType: "PAID" | "DEBT";
}

export const completeBooking = async ({
  bookingId,
  paymentType,
}: CompleteBookingParams) => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // AUTORIZAÇÃO
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  // =====================================================
  // TRANSAÇÃO
  // =====================================================
  //
  // A conclusão do atendimento e o registro financeiro
  // precisam acontecer juntos.
  //
  // Assim evitamos situações como:
  //
  // Booking = COMPLETED
  // mas pagamento não registrado.
  //
  // Ou:
  //
  // Booking = COMPLETED
  // mas fiado não criado.
  //
  // =====================================================

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // ===================================================
    // BUSCAR AGENDAMENTO
    // ===================================================

    const booking = await tx.booking.findUnique({
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

    // ===================================================
    // EVITAR DUPLICIDADE
    // ===================================================

    if (booking.status === "COMPLETED") {
      throw new Error("Este agendamento já foi concluído.");
    }

    // ===================================================
    // CONCLUIR AGENDAMENTO
    // ===================================================

    const updatedBooking = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: {
          not: "COMPLETED",
        },
      },

      data: {
        status: "COMPLETED",
      },
    });

    // ===================================================
    // PROTEÇÃO CONTRA DUPLO PROCESSAMENTO
    // ===================================================

    if (updatedBooking.count === 0) {
      throw new Error("Este agendamento já foi concluído.");
    }

    // ===================================================
    // FIADO
    // ===================================================

    if (paymentType === "DEBT") {
      await tx.customerDebt.create({
        data: {
          userId: booking.userId,
          bookingId: booking.id,

          // Mantém os dados do cliente manual, quando
          // existirem no Booking.
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,

          amount: booking.service.price,

          type: "DEBT",

          description: `Fiado - ${booking.service.name}`,
        },
      });
    }

    // ===================================================
    // PAGAMENTO NORMAL
    // ===================================================

    if (paymentType === "PAID") {
      await tx.financialTransaction.create({
        data: {
          amount: booking.service.price,

          type: "SERVICE_PAYMENT",

          description: `Pagamento - ${booking.service.name}`,

          bookingId: booking.id,

          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
        },
      });
    }
  });

  // =====================================================
  // ATUALIZAR DASHBOARD
  // =====================================================

  revalidatePath("/barbeiro/dashboard");

  revalidatePath("/");

  // =====================================================
  // RETORNO
  // =====================================================

  return {
    success: true,
  };
};
