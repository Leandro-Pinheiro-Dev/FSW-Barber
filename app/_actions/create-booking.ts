"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

interface CreateBookingParams {
  serviceIds: string[];
  date: string;
  time: string;
  userId?: string;
}

export const createBooking = async ({
  serviceIds,
  date,
  time,
  userId,
}: CreateBookingParams) => {
  // =====================================================
  // 1. AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // 2. VALIDAR SERVIÇOS
  // =====================================================

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new Error("Selecione pelo menos um serviço.");
  }

  // Remove possíveis IDs duplicados
  const uniqueServiceIds = [...new Set(serviceIds)];

  // =====================================================
  // 3. DEFINIR O CLIENTE
  // =====================================================

  const bookingUserId =
    session.user.role === "BARBER" && userId ? userId : session.user.id;

  // =====================================================
  // 4. VALIDAR DATA
  // =====================================================

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data inválida.");
  }

  // =====================================================
  // 5. VALIDAR HORÁRIO
  // =====================================================

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Horário inválido.");
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Horário inválido.");
  }

  // =====================================================
  // 6. BUSCAR OS SERVIÇOS
  // =====================================================

  const services = await db.barbershopService.findMany({
    where: {
      id: {
        in: uniqueServiceIds,
      },
    },
  });

  console.log("SERVICES:", services);

  if (services.length !== uniqueServiceIds.length) {
    throw new Error("Um ou mais serviços não foram encontrados.");
  }

  // =====================================================
  // 7. GARANTIR QUE TODOS OS SERVIÇOS SÃO DA MESMA
  //    BARBEARIA
  // =====================================================

  const barbershopId = services[0].barbershopId;

  const allFromSameBarbershop = services.every(
    (service: { barbershopId: string }) =>
      service.barbershopId === barbershopId,
  );

  if (!allFromSameBarbershop) {
    throw new Error(
      "Os serviços selecionados pertencem a barbearias diferentes.",
    );
  }

  // =====================================================
  // 8. DIA DA SEMANA
  //
  // Usamos explicitamente o horário de Brasília.
  // =====================================================

  const [year, month, day] = date.split("-").map(Number);

  const brazilDate = new Date(Date.UTC(year, month - 1, day, 3, 0, 0));

  const dayOfWeek = brazilDate.getUTCDay();

  console.log("=================================");
  console.log("NOVO AGENDAMENTO");
  console.log("DATA:", date);
  console.log("HORÁRIO:", time);
  console.log("DIA DA SEMANA:", dayOfWeek);
  console.log("SERVIÇOS:", uniqueServiceIds);
  console.log("=================================");

  // =====================================================
  // 9. VERIFICAR HORÁRIO FIXO
  // =====================================================

  const fixedSchedule = await db.fixedSchedule.findFirst({
    where: {
      barbershopId,
      dayOfWeek,
      time,
      active: true,
    },
  });

  if (fixedSchedule) {
    throw new Error(
      `Este horário já está reservado para ${fixedSchedule.clientName}.`,
    );
  }

  // =====================================================
  // 10. CRIAR DATA NO HORÁRIO DE BRASÍLIA
  //
  // Exemplo:
  // 2026-09-18 15:00 Brasil
  //
  // será armazenado como:
  // 2026-09-18T18:00:00.000Z
  // =====================================================

  const bookingDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Não foi possível criar a data do agendamento.");
  }

  // =====================================================
  // 11. VERIFICAR SE O HORÁRIO JÁ ESTÁ OCUPADO
  // =====================================================

  const slotStart = new Date(bookingDate);

  slotStart.setSeconds(0, 0);

  const slotEnd = new Date(slotStart);

  slotEnd.setMinutes(slotEnd.getMinutes() + 1);

  const existingBooking = await db.booking.findFirst({
    where: {
      date: {
        gte: slotStart,
        lt: slotEnd,
      },

      status: {
        not: "CANCELLED",
      },
    },
  });

  if (existingBooking) {
    throw new Error("Este horário já está reservado por outro cliente.");
  }

  // =====================================================
  // 12. CRIAR O AGENDAMENTO
  // =====================================================
  //
  // O Booking possui um serviceId legado para compatibilidade,
  // mas os serviços realmente selecionados ficam em bookingItems.
  // =====================================================

  const booking = await db.booking.create({
    data: {
      userId: bookingUserId,

      // Mantemos o primeiro serviço no campo legado.
      serviceId: uniqueServiceIds[0],

      date: bookingDate,

      status: "PENDING",

      // Salva TODOS os serviços selecionados no agendamento.
      bookingItems: {
        create: services.map((service) => ({
          serviceId: service.id,
          price: service.price,
        })),
      },
    },

    // IMPORTANTE:
    // include fica FORA do data.
    include: {
      bookingItems: {
        include: {
          service: true,
        },
      },
    },
  });

  console.log("=================================");
  console.log("AGENDAMENTO CRIADO");
  console.log("ID:", booking.id);
  console.log("CLIENTE:", bookingUserId);
  console.log("SERVIÇOS:", uniqueServiceIds);
  console.log("DATA:", booking.date);
  console.log("STATUS:", booking.status);
  console.log("=================================");

  // =====================================================
  // 13. ATUALIZAR CACHE
  // =====================================================

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/barbeiro/dashboard");

  return {
    success: true,
    bookingId: booking.id,
  };
};
