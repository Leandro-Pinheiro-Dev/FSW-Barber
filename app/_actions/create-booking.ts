"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateBookingDiscount } from "@/app/utils/booking-discount";
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
  // 3. DEFINIR O USUÁRIO DO AGENDAMENTO
  // =====================================================

  // Cliente:
  // - sempre cria o próprio agendamento.
  //
  // Barbeiro:
  // - pode criar agendamento para outro usuário através
  //   do parâmetro userId.

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
  // 6. REGRA OFICIAL DE FUNCIONAMENTO
  // =====================================================
  //
  // A barbearia atende somente:
  //
  // TERÇA A SÁBADO
  //
  // Domingo = 0
  // Segunda = 1
  // Terça = 2
  // Quarta = 3
  // Quinta = 4
  // Sexta = 5
  // Sábado = 6
  //
  // Horários:
  //
  // 08:00 até 11:00
  // 13:00 até 20:00
  //
  // 12:00 fica bloqueado para almoço.

  const [year, month, day] = date.split("-").map(Number);

  /*
   * Criamos uma data UTC apenas para descobrir
   * corretamente o dia da semana da data informada.
   *
   * Usamos meio-dia UTC para evitar problemas de mudança
   * de dia causados pelo fuso horário.
   */
  const dateForDayOfWeek = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (Number.isNaN(dateForDayOfWeek.getTime())) {
    throw new Error("Data inválida.");
  }

  const dayOfWeek = dateForDayOfWeek.getUTCDay();

  // Domingo e segunda-feira não possuem atendimento.
  if (dayOfWeek === 0 || dayOfWeek === 1) {
    throw new Error("A barbearia funciona somente de terça a sábado.");
  }

  // Horários oficialmente permitidos.
  const allowedTimes = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ];

  if (!allowedTimes.includes(time)) {
    throw new Error("Este horário não está disponível para agendamento.");
  }

  // =====================================================
  // 7. BUSCAR OS SERVIÇOS NO BANCO
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
  // 8. GARANTIR QUE OS SERVIÇOS SÃO DA MESMA BARBEARIA
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
  // 9. CALCULAR DESCONTO NO SERVIDOR
  // =====================================================

  // O desconto é calculado novamente no servidor.
  //
  // Não confiamos nos valores enviados pelo navegador.
  //
  // Exemplos:
  //
  // Corte + Barba
  // R$35 + R$35 = R$70
  // Desconto = R$10
  // Total = R$60
  //
  // Barba + Pézinho
  // R$35 + R$10 = R$45
  // Desconto = R$5
  // Total = R$40

  const discountResult = calculateBookingDiscount(
    services.map((service) => ({
      name: service.name,
      price: Number(service.price),
    })),
  );

  // =====================================================
  // 10. VERIFICAR HORÁRIO FIXO
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
  // 11. CRIAR DATA COMPLETA DO AGENDAMENTO
  // =====================================================

  /*
   * O horário informado é tratado como horário de São Paulo.
   *
   * Exemplo:
   *
   * 2026-09-19 + 10:00
   *
   * será:
   *
   * 19/09/2026 às 10:00 no horário de São Paulo.
   */

  const bookingDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Não foi possível criar a data do agendamento.");
  }

  // =====================================================
  // 12. VERIFICAR SE O HORÁRIO JÁ ESTÁ OCUPADO
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
  // 13. CRIAR O AGENDAMENTO
  // =====================================================

  const booking = await db.booking.create({
    data: {
      userId: bookingUserId,

      // O primeiro serviço continua sendo usado pelo
      // campo serviceId legado.
      serviceId: uniqueServiceIds[0],

      date: bookingDate,

      status: "PENDING",

      // =================================================
      // VALORES FINANCEIROS DO AGENDAMENTO
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
  // 14. ATUALIZAR AS PÁGINAS
  // =====================================================

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/barbeiro/dashboard");

  // =====================================================
  // 15. RETORNAR RESULTADO
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
