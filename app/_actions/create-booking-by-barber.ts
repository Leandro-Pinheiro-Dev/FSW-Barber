"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateBookingDiscount } from "@/app/utils/booking-discount";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

interface CreateBookingByBarberParams {
  // Agora aceitamos vários serviços
  serviceIds: string[];

  date: Date;

  userId?: string;

  clientName?: string;

  clientPhone?: string;
}

export const createBookingByBarber = async ({
  serviceIds,
  date,
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

  // Remove serviços duplicados
  const uniqueServiceIds = [...new Set(serviceIds)];

  // =====================================================
  // 4. BUSCAR TODOS OS SERVIÇOS
  // =====================================================

  const services = await db.barbershopService.findMany({
    where: {
      id: {
        in: uniqueServiceIds,
      },
    },
  });

  // Verifica se todos os serviços existem
  if (services.length !== uniqueServiceIds.length) {
    throw new Error("Um ou mais serviços não foram encontrados.");
  }

  // =====================================================
  // 5. GARANTIR QUE TODOS PERTENCEM À MESMA BARBEARIA
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
  // 6. CALCULAR DESCONTO
  // =====================================================

  // O cálculo é feito no servidor usando os preços
  // armazenados no banco.

  const discountResult = calculateBookingDiscount(
    services.map((service) => ({
      name: service.name,
      price: Number(service.price),
    })),
  );

  // =====================================================
  // 7. DEFINIR TIPO DE CLIENTE
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
  // 8. CLIENTE CADASTRADO
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
  // 9. CLIENTE MANUAL
  // =====================================================

  const normalizedClientName = clientName?.trim() || null;

  const normalizedClientPhone = clientPhone?.trim() || null;

  if (hasManualClient && !normalizedClientName) {
    throw new Error("Informe o nome do cliente.");
  }

  // =====================================================
  // 10. VALIDAR DATA
  // =====================================================

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("Data ou horário inválido.");
  }

  // =====================================================
  // 11. DIA DA SEMANA E HORÁRIO
  // =====================================================

  const dayOfWeek = date.getDay();

  const time = format(date, "HH:mm");

  // =====================================================
  // 12. VERIFICAR HORÁRIO FIXO
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
  // 13. VERIFICAR OUTRO AGENDAMENTO
  // =====================================================

  const existingBooking = await db.booking.findFirst({
    where: {
      date,
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
  // 14. CRIAR AGENDAMENTO
  // =====================================================

  const booking = await db.booking.create({
    data: {
      userId: userId || null,

      clientName: normalizedClientName,

      clientPhone: normalizedClientPhone,

      // O primeiro serviço continua sendo colocado em
      // serviceId para manter compatibilidade com o modelo.
      serviceId: uniqueServiceIds[0],

      date,

      status: "PENDING",

      // =================================================
      // VALORES FINANCEIROS
      // =================================================
      //
      // Estes valores são calculados no servidor e
      // persistidos no banco.

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
          // em que o agendamento foi criado.
          price: service.price,
        })),
      },
    },
  });

  // =====================================================
  // 15. ATUALIZAR PÁGINAS
  // =====================================================

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/barbeiro/dashboard");

  // =====================================================
  // 16. RETORNAR VALORES CALCULADOS
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
