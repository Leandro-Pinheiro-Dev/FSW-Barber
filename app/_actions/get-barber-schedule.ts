"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// =====================================================
// TIPOS DOS SERVIÇOS
// =====================================================

export interface BarberScheduleService {
  id: string;
  serviceId: string;
  name: string;
  price: number;
}

// =====================================================
// TIPO DO AGENDAMENTO DEVOLVIDO PARA O FRONTEND
// =====================================================

export interface BarberScheduleBooking {
  id: string;
  userId: string | null;
  serviceId: string;
  date: Date;

  clientName: string | null;
  clientPhone: string | null;

  serviceName: string;

  services: BarberScheduleService[];

  totalPrice: number;

  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
}

// =====================================================
// TIPO DOS HORÁRIOS FIXOS
// =====================================================

export interface BarberFixedSchedule {
  id: string;
  time: string;
  clientName: string;
}

// =====================================================
// RETORNO DA ACTION
// =====================================================

export interface BarberScheduleResult {
  bookings: BarberScheduleBooking[];
  fixedSchedules: BarberFixedSchedule[];
}

// =====================================================
// ACTION
// =====================================================

export const getBarberSchedule = async (
  date: string,
): Promise<BarberScheduleResult> => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // VERIFICAR BARBEIRO
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso permitido somente ao barbeiro.");
  }

  // =====================================================
  // VALIDAR DATA
  // =====================================================

  if (!date || typeof date !== "string") {
    throw new Error("Data não informada.");
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    console.error("DATA RECEBIDA:", date);

    throw new Error("Formato de data inválido.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // =====================================================
  // VALIDAR DATA REAL
  // =====================================================

  const validationDate = new Date(Date.UTC(year, month - 1, day));

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    console.error("DATA INVÁLIDA:", date);

    throw new Error("Data inválida para consultar a agenda.");
  }

  // =====================================================
  // DIA DA SEMANA
  // =====================================================

  const brazilDate = new Date(`${date}T12:00:00-03:00`);

  const dayOfWeek = brazilDate.getUTCDay();

  // =====================================================
  // INÍCIO DO DIA
  // =====================================================

  const startOfDay = new Date(`${date}T00:00:00-03:00`);

  // =====================================================
  // FINAL DO DIA
  // =====================================================

  const endOfDay = new Date(`${date}T23:59:59.999-03:00`);

  console.log("=================================");
  console.log("AGENDA");
  console.log("DATA RECEBIDA:", date);
  console.log("INÍCIO:", startOfDay);
  console.log("FINAL:", endOfDay);
  console.log("DIA DA SEMANA:", dayOfWeek);
  console.log("=================================");

  // =====================================================
  // BUSCAR AGENDAMENTOS
  // =====================================================

  const bookings = await db.booking.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },

      status: {
        not: "CANCELLED",
      },
    },

    include: {
      user: true,

      // Serviço antigo.
      // Mantemos para compatibilidade.
      service: true,

      // NOVO:
      // Todos os serviços desse agendamento.
      bookingItems: {
        include: {
          service: true,
        },

        orderBy: {
          createdAt: "asc",
        },
      },
    },

    orderBy: {
      date: "asc",
    },
  });

  // =====================================================
  // BUSCAR HORÁRIOS FIXOS
  // =====================================================

  const fixedSchedules = await db.fixedSchedule.findMany({
    where: {
      dayOfWeek,
      active: true,
    },

    orderBy: {
      time: "asc",
    },
  });

  // =====================================================
  // FORMATAR AGENDAMENTOS
  // =====================================================

  const formattedBookings: BarberScheduleBooking[] = bookings.map((booking) => {
    // =================================================
    // SERVIÇOS
    // =================================================

    const services: BarberScheduleService[] =
      booking.bookingItems.length > 0
        ? booking.bookingItems.map((item) => ({
            id: item.id,
            serviceId: item.serviceId,
            name: item.service.name,
            price: Number(item.price),
          }))
        : [
            {
              id: booking.service.id,
              serviceId: booking.service.id,
              name: booking.service.name,
              price: Number(booking.service.price),
            },
          ];

    // =================================================
    // TOTAL
    // =================================================

    const totalPrice = services.reduce(
      (sum: number, item: BarberScheduleService) => sum + item.price,
      0,
    );

    // =================================================
    // NOME DOS SERVIÇOS
    // =================================================

    const serviceName = services
      .map((item: BarberScheduleService) => item.name)
      .join(" + ");

    // =================================================
    // CLIENTE
    // =================================================

    const clientName =
      booking.clientName ??
      booking.user?.name ??
      booking.user?.email ??
      "Cliente";

    // =================================================
    // RETORNO
    // =================================================

    return {
      id: booking.id,

      userId: booking.userId,

      serviceId: booking.serviceId,

      date: booking.date,

      clientName,

      clientPhone: booking.clientPhone ?? null,

      serviceName,

      services,

      totalPrice,

      status: booking.status,
    };
  });

  // =====================================================
  // FORMATAR HORÁRIOS FIXOS
  // =====================================================

  const formattedFixedSchedules: BarberFixedSchedule[] = fixedSchedules.map(
    (schedule) => ({
      id: schedule.id,
      time: schedule.time,
      clientName: schedule.clientName,
    }),
  );

  // =====================================================
  // RETORNAR
  // =====================================================

  return {
    bookings: formattedBookings,
    fixedSchedules: formattedFixedSchedules,
  };
};
