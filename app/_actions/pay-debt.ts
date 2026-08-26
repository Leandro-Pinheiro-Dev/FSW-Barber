"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface PayDebtParams {
  userId?: string | null;
  bookingId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  amount: number;
}

export const payDebt = async ({
  userId,
  bookingId,
  clientName,
  clientPhone,
  amount,
}: PayDebtParams) => {
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
  // VALIDAÇÃO DO VALOR
  // =====================================================

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.");
  }

  // =====================================================
  // PRECISA TER UMA IDENTIFICAÇÃO
  // =====================================================

  if (!userId && !bookingId && !clientName) {
    throw new Error("Não foi possível identificar o cliente do pagamento.");
  }

  // =====================================================
  // LOCALIZAR AS DÍVIDAS
  // =====================================================

  let transactions;

  // -----------------------------------------------------
  // CLIENTE CADASTRADO
  // -----------------------------------------------------

  if (userId) {
    transactions = await db.customerDebt.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  // -----------------------------------------------------
  // AGENDAMENTO MANUAL
  // -----------------------------------------------------
  else if (bookingId) {
    transactions = await db.customerDebt.findMany({
      where: {
        bookingId,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  // -----------------------------------------------------
  // CLIENTE MANUAL SEM BOOKING
  // -----------------------------------------------------
  else {
    transactions = await db.customerDebt.findMany({
      where: {
        userId: null,
        clientName: clientName ?? undefined,
        clientPhone: clientPhone ?? undefined,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  // =====================================================
  // VERIFICAR SE EXISTEM TRANSAÇÕES
  // =====================================================

  if (!transactions || transactions.length === 0) {
    throw new Error("Nenhuma movimentação encontrada para este cliente.");
  }

  // =====================================================
  // CALCULAR SALDO
  // =====================================================

  const totalDebt = transactions.reduce((total, transaction) => {
    const value = Number(transaction.amount);

    if (transaction.type === "DEBT") {
      return total + value;
    }

    return total - value;
  }, 0);

  // =====================================================
  // VERIFICAR SALDO
  // =====================================================

  if (totalDebt <= 0) {
    throw new Error("Este cliente não possui fiado em aberto.");
  }

  // =====================================================
  // PAGAMENTO MAIOR QUE A DÍVIDA
  // =====================================================

  if (amount > totalDebt) {
    throw new Error(
      `O pagamento não pode ser maior que a dívida de R$ ${totalDebt.toFixed(
        2,
      )}.`,
    );
  }

  // =====================================================
  // DEFINIR DADOS DO CLIENTE
  // =====================================================

  const lastTransaction = transactions[transactions.length - 1];

  const finalClientName = clientName ?? lastTransaction?.clientName ?? null;

  const finalClientPhone = clientPhone ?? lastTransaction?.clientPhone ?? null;

  // =====================================================
  // DEFINIR BOOKING DO PAGAMENTO
  // =====================================================

  const finalBookingId = bookingId ?? lastTransaction?.bookingId ?? null;

  // =====================================================
  // CRIAR PAGAMENTO
  // =====================================================

  await db.customerDebt.create({
    data: {
      userId: userId ?? null,
      bookingId: finalBookingId,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      amount,
      type: "PAYMENT",
      description: "Pagamento de fiado",
    },
  });

  // =====================================================
  // NOVO SALDO
  // =====================================================

  const remainingAmount = totalDebt - amount;

  // =====================================================
  // ATUALIZAR DASHBOARD
  // =====================================================

  revalidatePath("/barbeiro/dashboard");

  // =====================================================
  // RETORNO
  // =====================================================

  return {
    success: true,
    paidAmount: amount,
    remainingAmount,
  };
};
