"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const getDashboardSummary = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  // =====================================================
  // TOTAL EM FIADOS
  // =====================================================

  const debts = await db.customerDebt.findMany({
    select: {
      userId: true,
      amount: true,
      type: true,
    },
  });

  const customerBalances = new Map<string, number>();

  debts.forEach((debt) => {
    // Fiados de clientes manuais não possuem userId.
    // Eles serão controlados através do bookingId.
    if (!debt.userId) {
      return;
    }

    const current = customerBalances.get(debt.userId) ?? 0;

    const value =
      debt.type === "DEBT" ? Number(debt.amount) : -Number(debt.amount);

    customerBalances.set(debt.userId, current + value);
  });

  const customersWithDebt = Array.from(customerBalances.values()).filter(
    (balance) => balance > 0,
  );

  const totalDebt = customersWithDebt.reduce(
    (total, balance) => total + balance,
    0,
  );

  // =====================================================
  // DATA ATUAL
  // =====================================================

  const now = new Date();

  // =====================================================
  // INÍCIO E FIM DO DIA
  // =====================================================

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // =====================================================
  // FATURAMENTO DO DIA
  // =====================================================

  const completedBookingsToday = await db.booking.findMany({
    where: {
      status: "COMPLETED",
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      service: true,
    },
  });

  const dailyRevenue = completedBookingsToday.reduce(
    (total, booking) => total + Number(booking.service.price),
    0,
  );

  // =====================================================
  // INÍCIO E FIM DO MÊS
  // =====================================================

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  // =====================================================
  // FATURAMENTO DO MÊS
  // =====================================================

  const completedBookingsMonth = await db.booking.findMany({
    where: {
      status: "COMPLETED",
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    include: {
      service: true,
    },
  });

  const monthlyRevenue = completedBookingsMonth.reduce(
    (total, booking) => total + Number(booking.service.price),
    0,
  );

  // =====================================================
  // RETORNO
  // =====================================================

  return {
    totalDebt,
    customersWithDebt: customersWithDebt.length,
    dailyRevenue,
    monthlyRevenue,
  };
};
