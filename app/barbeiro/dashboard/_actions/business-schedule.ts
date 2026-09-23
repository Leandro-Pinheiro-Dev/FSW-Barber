"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

/**
 * ============================================================
 * TIPOS
 * ============================================================
 */

export interface BusinessScheduleDay {
  dayOfWeek: number;
  active: boolean;
  timeSlots: {
    time: string;
    active: boolean;
  }[];
}

/**
 * ============================================================
 * VERIFICAR SE O USUÁRIO É BARBEIRO
 * ============================================================
 */

async function requireBarber() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Não autenticado.");
  }

  const user = await db.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  if (user.role !== "BARBER") {
    throw new Error("Acesso permitido apenas para barbeiros.");
  }

  return user;
}

/**
 * ============================================================
 * BUSCAR BARBEARIA
 * ============================================================
 *
 * O projeto atualmente trabalha com uma única barbearia.
 * Buscamos pelo primeiro registro para não deixar ID fixo
 * no código.
 */

async function getBarbershop() {
  const barbershop = await db.barbershop.findFirst({
    select: {
      id: true,
    },
  });

  if (!barbershop) {
    throw new Error("Barbearia não encontrada.");
  }

  return barbershop;
}

/**
 * ============================================================
 * BUSCAR CONFIGURAÇÃO COMPLETA DA AGENDA
 * ============================================================
 *
 * Essa função é usada tanto pelo dashboard quanto,
 * posteriormente, pela área do cliente.
 */

export async function getBusinessSchedule(): Promise<BusinessScheduleDay[]> {
  const barbershop = await getBarbershop();

  const days = await db.businessDay.findMany({
    where: {
      barbershopId: barbershop.id,
    },
    orderBy: {
      dayOfWeek: "asc",
    },
  });

  const timeSlots = await db.businessTimeSlot.findMany({
    where: {
      barbershopId: barbershop.id,
    },
    orderBy: [
      {
        dayOfWeek: "asc",
      },
      {
        time: "asc",
      },
    ],
  });

  return days.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    active: day.active,

    timeSlots: timeSlots
      .filter((slot) => slot.dayOfWeek === day.dayOfWeek)
      .map((slot) => ({
        time: slot.time,
        active: slot.active,
      })),
  }));
}

/**
 * ============================================================
 * ABRIR / FECHAR DIA
 * ============================================================
 *
 * dayOfWeek:
 *
 * 0 = Domingo
 * 1 = Segunda
 * 2 = Terça
 * 3 = Quarta
 * 4 = Quinta
 * 5 = Sexta
 * 6 = Sábado
 *
 * IMPORTANTE:
 *
 * Essa operação NÃO altera FixedSchedule.
 * Também não cancela agendamentos existentes.
 *
 * Ela somente controla se novos agendamentos poderão
 * ser realizados nesse dia.
 */

export async function updateBusinessDay(dayOfWeek: number, active: boolean) {
  await requireBarber();

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("Dia da semana inválido.");
  }

  if (typeof active !== "boolean") {
    throw new Error("Status do dia inválido.");
  }

  const barbershop = await getBarbershop();

  const day = await db.businessDay.upsert({
    where: {
      barbershopId_dayOfWeek: {
        barbershopId: barbershop.id,
        dayOfWeek,
      },
    },

    update: {
      active,
    },

    create: {
      barbershopId: barbershop.id,
      dayOfWeek,
      active,
    },
  });

  /**
   * Atualiza as páginas que futuramente utilizarão
   * a configuração da agenda.
   */

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/barbershops");
  revalidatePath(`/barbershops/${barbershop.id}`);

  return {
    success: true,
    day: {
      dayOfWeek: day.dayOfWeek,
      active: day.active,
    },
  };
}

/**
 * ============================================================
 * BLOQUEAR / LIBERAR HORÁRIO
 * ============================================================
 *
 * Exemplo:
 *
 * updateBusinessTimeSlot(5, "15:00", false)
 *
 * Bloqueia sexta-feira às 15:00.
 *
 * IMPORTANTE:
 *
 * FixedSchedule continua intacto.
 */

export async function updateBusinessTimeSlot(
  dayOfWeek: number,
  time: string,
  active: boolean,
) {
  await requireBarber();

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("Dia da semana inválido.");
  }

  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Horário inválido.");
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Horário inválido.");
  }

  if (typeof active !== "boolean") {
    throw new Error("Status do horário inválido.");
  }

  const barbershop = await getBarbershop();

  const slot = await db.businessTimeSlot.upsert({
    where: {
      barbershopId_dayOfWeek_time: {
        barbershopId: barbershop.id,
        dayOfWeek,
        time,
      },
    },

    update: {
      active,
    },

    create: {
      barbershopId: barbershop.id,
      dayOfWeek,
      time,
      active,
    },
  });

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/barbershops");
  revalidatePath(`/barbershops/${barbershop.id}`);

  return {
    success: true,
    slot: {
      dayOfWeek: slot.dayOfWeek,
      time: slot.time,
      active: slot.active,
    },
  };
}
