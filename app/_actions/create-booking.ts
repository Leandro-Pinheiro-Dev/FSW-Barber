"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateBookingDiscount } from "@/app/utils/booking-discount";
import { validateBusinessSchedule } from "@/lib/business-schedule";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

interface CreateBookingParams {
  serviceIds: string[];
  date: string;
  time: string;
}

export const createBooking = async ({
  serviceIds,
  date,
  time,
}: CreateBookingParams) => {
  // =====================================================
  // 1. VERIFICAR AUTENTICAÇÃO
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

  // Remove serviços duplicados
  const uniqueServiceIds = [...new Set(serviceIds)];

  // =====================================================
  // 3. VALIDAR DATA
  // =====================================================

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data inválida.");
  }

  // =====================================================
  // 4. VALIDAR HORÁRIO
  // =====================================================

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Horário inválido.");
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("Horário inválido.");
  }

  // =====================================================
  // 5. DESCOBRIR O DIA DA SEMANA
  // =====================================================

  // Usamos UTC ao meio-dia apenas para descobrir
  // corretamente o dia da semana da data escolhida,
  // sem sofrer alteração por fuso horário.
  const [year, month, day] = date.split("-").map(Number);

  const dateForDayOfWeek = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (Number.isNaN(dateForDayOfWeek.getTime())) {
    throw new Error("Data inválida.");
  }

  const dayOfWeek = dateForDayOfWeek.getUTCDay();

  // =====================================================
  // 6. BUSCAR OS SERVIÇOS NO BANCO
  // =====================================================

  const services = await db.barbershopService.findMany({
    where: {
      id: {
        in: uniqueServiceIds,
      },
    },
  });

  // Verifica se todos os serviços realmente existem.
  if (services.length !== uniqueServiceIds.length) {
    throw new Error("Um ou mais serviços não foram encontrados.");
  }

  // =====================================================
  // 7. GARANTIR QUE OS SERVIÇOS SÃO DA MESMA BARBEARIA
  // =====================================================

  const barbershopId = services[0].barbershopId;

  const allFromSameBarbershop = services.every(
    (service) => service.barbershopId === barbershopId,
  );

  if (!allFromSameBarbershop) {
    throw new Error(
      "Os serviços selecionados pertencem a barbearias diferentes.",
    );
  }

  // =====================================================
  // 8. VALIDAR AGENDA DA BARBEARIA
  // =====================================================

  // A configuração vem diretamente do banco.

  // Isso verifica:
  //
  // - se o dia está aberto;
  // - se o horário está liberado;
  // - se o horário existe na configuração.
  //
  // Não usamos mais uma lista fixa de horários aqui.

  await validateBusinessSchedule({
    barbershopId,
    dayOfWeek,
    time,
  });

  // =====================================================
  // 9. DEFINIR O USUÁRIO DO AGENDAMENTO
  // =====================================================

  // Cliente cria o próprio agendamento.
  //
  // Se futuramente o barbeiro utilizar esta action para
  // criar para outro cliente, essa regra pode ser ampliada.
  const bookingUserId = session.user.id;

  // =====================================================
  // 10. CALCULAR DESCONTO NO SERVIDOR
  // =====================================================

  // O desconto é calculado novamente no servidor.
  //
  // Não confiamos nos valores enviados pelo navegador.

  const discountResult = calculateBookingDiscount(
    services.map((service) => ({
      name: service.name,
      price: Number(service.price),
    })),
  );

  // =====================================================
  // 11. VERIFICAR HORÁRIO FIXO
  // =====================================================

  // IMPORTANTE:
  // Não apagamos nem alteramos FixedSchedule.
  //
  // Mesmo que um horário seja bloqueado na configuração
  // da agenda, os horários fixos continuam preservados.

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
  // 12. CRIAR DATA COMPLETA DO AGENDAMENTO
  // =====================================================

  // O horário informado é tratado como horário de São Paulo.
  //
  // Exemplo:
  //
  // 2026-09-19 + 10:00
  //
  // será:
  //
  // 19/09/2026 às 10:00 no horário de São Paulo.

  const bookingDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Não foi possível criar a data do agendamento.");
  }

  // =====================================================
  // 13. VERIFICAR SE O HORÁRIO JÁ ESTÁ OCUPADO
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
  // 14. CRIAR O AGENDAMENTO
  // =====================================================

  const booking = await db.booking.create({
    data: {
      userId: bookingUserId,

      // O primeiro serviço continua sendo usado
      // pelo campo serviceId legado.
      serviceId: uniqueServiceIds[0],

      date: bookingDate,

      status: "PENDING",

      // =================================================
      // VALORES FINANCEIROS
      // =================================================

      subtotal: discountResult.subtotal,
      discount: discountResult.discount,
      total: discountResult.total,

      // =================================================
      // SERVIÇOS DO AGENDAMENTO
      // =================================================

      bookingItems: {
        create: services.map((service) => ({
          serviceId: service.id,

          // Guarda o preço daquele serviço no momento
          // em que o agendamento foi criado.
          price: service.price,
        })),
      },
    },

    include: {
      bookingItems: {
        include: {
          service: true,
        },
      },
    },
  });

  // =====================================================
  // 15. ATUALIZAR AS PÁGINAS
  // =====================================================

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/barbeiro/dashboard");

  // =====================================================
  // 16. RETORNAR RESULTADO
  // =====================================================

  return {
    success: true,
    bookingId: booking.id,

    // Valores calculados pelo servidor.
    subtotal: discountResult.subtotal,
    discount: discountResult.discount,
    total: discountResult.total,
    discountDescription: discountResult.description,
  };
};
