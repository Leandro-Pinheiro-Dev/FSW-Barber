"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateBookingDiscount } from "@/app/utils/booking-discount";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

interface CreateBookingByBarberParams {
  // =====================================================
  // SERVIÇOS
  // =====================================================

  serviceIds: string[];

  // =====================================================
  // DATA E HORÁRIO
  // =====================================================
  //
  // Recebemos separados para evitar problemas de timezone.
  //
  // Exemplo:
  //
  // date = "2026-09-18"
  // time = "10:00"
  //
  // A data completa será criada no servidor usando
  // explicitamente o horário de São Paulo.
  //
  date: string;
  time: string;

  // =====================================================
  // CLIENTE
  // =====================================================

  userId?: string;

  clientName?: string;

  clientPhone?: string;
}

export const createBookingByBarber = async ({
  serviceIds,
  date,
  time,
  userId,
  clientName,
  clientPhone,
}: CreateBookingByBarberParams) => {
  // =====================================================
  // 1. AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // 2. SOMENTE BARBEIRO PODE CRIAR PELO PAINEL
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Apenas o barbeiro pode criar agendamentos.");
  }

  // =====================================================
  // 3. VALIDAR SERVIÇOS
  // =====================================================

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new Error("Selecione pelo menos um serviço.");
  }

  // Remove serviços duplicados.
  const uniqueServiceIds = [...new Set(serviceIds)];

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
  // 6. DESCOBRIR O DIA DA SEMANA
  // =====================================================
  //
  // Usamos UTC ao meio-dia somente para descobrir o dia
  // da semana da DATA CIVIL.
  //
  // Isso evita que o timezone do servidor altere o dia.
  //
  // Domingo = 0
  // Segunda = 1
  // Terça = 2
  // Quarta = 3
  // Quinta = 4
  // Sexta = 5
  // Sábado = 6
  // =====================================================

  const [year, month, day] = date.split("-").map(Number);

  const dateForDayOfWeek = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (Number.isNaN(dateForDayOfWeek.getTime())) {
    throw new Error("Data inválida.");
  }

  const dayOfWeek = dateForDayOfWeek.getUTCDay();

  // =====================================================
  // 7. REGRA DE FUNCIONAMENTO
  // =====================================================
  //
  // A barbearia atende de terça a sábado.
  //
  // Domingo = 0
  // Segunda = 1
  // =====================================================

  if (dayOfWeek === 0 || dayOfWeek === 1) {
    throw new Error("A barbearia funciona somente de terça a sábado.");
  }

  // =====================================================
  // 8. HORÁRIOS PERMITIDOS
  // =====================================================

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
  // 9. BUSCAR TODOS OS SERVIÇOS
  // =====================================================

  const services = await db.barbershopService.findMany({
    where: {
      id: {
        in: uniqueServiceIds,
      },
    },
  });

  // Verifica se todos os serviços existem.
  if (services.length !== uniqueServiceIds.length) {
    throw new Error("Um ou mais serviços não foram encontrados.");
  }

  // =====================================================
  // 10. GARANTIR QUE TODOS PERTENCEM À MESMA BARBEARIA
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
  // 11. CALCULAR DESCONTO
  // =====================================================

  const discountResult = calculateBookingDiscount(
    services.map((service) => ({
      name: service.name,
      price: Number(service.price),
    })),
  );

  // =====================================================
  // 12. DEFINIR TIPO DE CLIENTE
  // =====================================================

  const hasRegisteredClient = Boolean(userId);

  const hasManualClient = Boolean(clientName?.trim());

  if (!hasRegisteredClient && !hasManualClient) {
    throw new Error("Selecione um cliente ou informe o cliente manualmente.");
  }

  if (hasRegisteredClient && hasManualClient) {
    throw new Error("Escolha apenas um tipo de cliente: cadastrado ou manual.");
  }

  // =====================================================
  // 13. CLIENTE CADASTRADO
  // =====================================================

  if (userId) {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error("Cliente cadastrado não encontrado.");
    }
  }

  // =====================================================
  // 14. CLIENTE MANUAL
  // =====================================================

  const normalizedClientName = clientName?.trim() || null;

  const normalizedClientPhone = clientPhone?.trim() || null;

  if (hasManualClient && !normalizedClientName) {
    throw new Error("Informe o nome do cliente.");
  }

  // =====================================================
  // 15. CRIAR DATA COMPLETA
  // =====================================================
  //
  // IMPORTANTE:
  //
  // A data é criada explicitamente no horário de São Paulo.
  //
  // Isso mantém o mesmo comportamento do agendamento
  // realizado pelo cliente.
  //
  // Exemplo:
  //
  // 2026-09-18 + 10:00
  //
  // vira:
  //
  // 18/09/2026 às 10:00 em São Paulo.
  // =====================================================

  const bookingDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Não foi possível criar a data do agendamento.");
  }

  // =====================================================
  // 16. VERIFICAR HORÁRIO FIXO
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
  // 17. VERIFICAR OUTRO AGENDAMENTO
  // =====================================================
  //
  // Procuramos dentro do minuto do horário selecionado.
  //
  // Isso evita depender de igualdade exata de Date.
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
    const existingClient = existingBooking.clientName || "outro cliente";

    throw new Error(`Este horário já está agendado para ${existingClient}.`);
  }

  // =====================================================
  // 18. CRIAR AGENDAMENTO
  // =====================================================

  const booking = await db.booking.create({
    data: {
      userId: userId || null,

      clientName: normalizedClientName,

      clientPhone: normalizedClientPhone,

      // Mantemos o primeiro serviço no campo legado.
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
      // TODOS OS SERVIÇOS
      // =================================================

      bookingItems: {
        create: services.map((service) => ({
          serviceId: service.id,

          // Guarda o preço do serviço no momento
          // da criação do agendamento.
          price: service.price,
        })),
      },
    },
  });

  // =====================================================
  // 19. ATUALIZAR PÁGINAS
  // =====================================================

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/barbeiro/dashboard");

  // =====================================================
  // 20. RETORNAR RESULTADO
  // =====================================================

  return {
    success: true,

    bookingId: booking.id,

    subtotal: discountResult.subtotal,

    discount: discountResult.discount,

    total: discountResult.total,

    discountDescription: discountResult.description,
  };
};
