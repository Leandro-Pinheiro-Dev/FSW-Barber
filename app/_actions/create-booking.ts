"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateBookingDiscount } from "@/app/utils/booking-discount";
import {
  getPricedBookingServices,
  isHaircutService,
} from "@/app/utils/booking-pricing";
import { validateBusinessSchedule } from "@/lib/business-schedule";
import { sendPushNotification } from "@/lib/push";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

interface CreateBookingParams {
  serviceIds: string[];
  date: string;
  time: string;
  isChild?: boolean;
}

export const createBooking = async ({
  serviceIds,
  date,
  time,
  isChild = false,
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
  // 8. VALIDAR REGRA DE CORTE INFANTIL
  // =====================================================

  // Se o cliente informou que é criança, precisamos garantir
  // que realmente existe Corte de Cabelo no agendamento.
  //
  // Isso evita que alguém tente enviar isChild=true para
  // Barba, Pézinho ou Sobrancelha e manipular o preço.

  const hasHaircut = services.some((service) => isHaircutService(service.name));

  if (isChild && !hasHaircut) {
    throw new Error(
      "O preço infantil só pode ser aplicado ao Corte de Cabelo.",
    );
  }

  // =====================================================
  // 9. VALIDAR AGENDA DA BARBEARIA
  // =====================================================

  // A configuração vem diretamente do banco.
  //
  // Isso verifica:
  //
  // - se o dia está aberto;
  // - se o horário está liberado;
  // - se o horário existe na configuração.

  await validateBusinessSchedule({
    barbershopId,
    dayOfWeek,
    time,
  });

  // =====================================================
  // 10. DEFINIR O USUÁRIO DO AGENDAMENTO
  // =====================================================

  // Cliente cria o próprio agendamento.

  const bookingUserId = session.user.id;

  // =====================================================
  // 11. CALCULAR PREÇOS DO AGENDAMENTO
  // =====================================================

  // O preço normal do Corte de Cabelo é R$35.
  //
  // Quando isChild === true:
  //
  // Corte de Cabelo = R$30
  //
  // Os demais serviços continuam com seus preços normais.
  //
  // IMPORTANTE:
  // Esse cálculo acontece no servidor.
  //
  // Portanto, o navegador não consegue simplesmente
  // enviar um preço diferente.

  const pricedServices = getPricedBookingServices(
    services.map((service) => ({
      id: service.id,
      name: service.name,
      price: Number(service.price),
    })),
    isChild,
  );

  // =====================================================
  // 12. CALCULAR DESCONTO DOS COMBOS
  // =====================================================

  // O desconto é aplicado DEPOIS do preço infantil.

  // Exemplo:
  //
  // Corte infantil + Barba
  //
  // R$30 + R$35 = R$65
  //
  // Combo Corte + Barba = -R$10
  //
  // Total = R$55

  const discountResult = calculateBookingDiscount(
    pricedServices.map((service) => ({
      name: service.name,
      price: service.price,
    })),
  );

  // =====================================================
  // 13. VERIFICAR HORÁRIO FIXO
  // =====================================================

  // FixedSchedule é a regra semanal.
  //
  // FixedScheduleException é uma exceção para uma data
  // específica, permitindo liberar aquele horário.

  const fixedSchedule = await db.fixedSchedule.findFirst({
    where: {
      barbershopId,
      dayOfWeek,
      time,
      active: true,
    },
  });

  if (fixedSchedule) {
    // ===================================================
    // VERIFICAR SE ESTE HORÁRIO FOI LIBERADO NESTA DATA
    // ===================================================

    const fixedScheduleException = await db.fixedScheduleException.findUnique({
      where: {
        barbershopId_date_time: {
          barbershopId,
          date: new Date(Date.UTC(year, month - 1, day)),
          time,
        },
      },
    });

    // ===================================================
    // SE NÃO EXISTIR EXCEÇÃO:
    // HORÁRIO CONTINUA RESERVADO PARA O CLIENTE FIXO
    // ===================================================

    if (!fixedScheduleException) {
      throw new Error(
        `Este horário já está reservado para ${fixedSchedule.clientName}.`,
      );
    }

    // ===================================================
    // SE EXISTIR EXCEÇÃO:
    // HORÁRIO FOI LIBERADO PARA OUTROS CLIENTES
    // ===================================================
  }

  // =====================================================
  // 14. CRIAR DATA COMPLETA DO AGENDAMENTO
  // =====================================================

  // O horário informado é tratado como horário de São Paulo.

  const bookingDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Não foi possível criar a data do agendamento.");
  }

  // =====================================================
  // 15. VERIFICAR SE O HORÁRIO JÁ ESTÁ OCUPADO
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
  // 16. CRIAR O AGENDAMENTO
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
        create: pricedServices.map((service) => ({
          serviceId: service.id,

          // Guarda o preço REAL cobrado no momento
          // em que o agendamento foi criado.
          //
          // Corte normal:
          // R$35
          //
          // Corte infantil:
          // R$30
          //
          // Isso mantém o histórico financeiro correto.

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
  // 17. ENVIAR PUSH PARA O BARBEIRO
  // =====================================================

  // IMPORTANTE:
  //
  // O Push é enviado DEPOIS que o agendamento foi salvo.
  //
  // Se o Push falhar, NÃO cancelamos o agendamento.
  // O cliente já conseguiu criar sua reserva normalmente.

  try {
    // Buscar os usuários que possuem perfil de barbeiro.

    const barbers = await db.user.findMany({
      where: {
        role: "BARBER",
      },

      select: {
        id: true,
        pushSubscriptions: true,
      },
    });

    // ===================================================
    // FORMATAR INFORMAÇÕES DO AGENDAMENTO
    // ===================================================

    const clientName = session.user.name?.trim() || "Um cliente";

    const servicesText = services.map((service) => service.name).join(" + ");

    // Data já está salva corretamente como horário de São Paulo.
    //
    // Aqui usamos Intl para mostrar a data ao barbeiro
    // no formato brasileiro.

    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(bookingDate);

    // ===================================================
    // ENVIAR PARA CADA BARBEIRO
    // ===================================================

    for (const barber of barbers) {
      for (const subscription of barber.pushSubscriptions) {
        try {
          await sendPushNotification(subscription, {
            title: "Novo agendamento ✂️",

            body: `${clientName} agendou ${servicesText} para ${formattedDate} às ${time}.`,

            url: "/barbeiro/dashboard",
          });

          console.log(`Push enviado para o barbeiro ${barber.id}.`);
        } catch (error: unknown) {
          console.error(
            `Erro ao enviar Push para o barbeiro ${barber.id}:`,
            error,
          );

          // ===============================================
          // IDENTIFICAR STATUS DA FALHA
          // ===============================================

          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof error.statusCode === "number"
              ? error.statusCode
              : undefined;

          // ===============================================
          // REMOVER INSCRIÇÃO EXPIRADA
          // ===============================================

          // 404 ou 410 normalmente significa que
          // a inscrição daquele dispositivo expirou.

          if (statusCode === 404 || statusCode === 410) {
            try {
              await db.pushSubscription.delete({
                where: {
                  id: subscription.id,
                },
              });

              console.log(`PushSubscription ${subscription.id} removida.`);
            } catch (deleteError) {
              console.error(
                "Erro ao remover PushSubscription expirada:",
                deleteError,
              );
            }
          }
        }
      }
    }
  } catch (error) {
    // ===================================================
    // O PUSH NÃO PODE IMPEDIR O AGENDAMENTO
    // ===================================================

    console.error("Erro geral ao enviar notificação para o barbeiro:", error);
  }

  // =====================================================
  // 18. ATUALIZAR AS PÁGINAS
  // =====================================================

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/barbeiro/dashboard");

  // =====================================================
  // 19. RETORNAR RESULTADO
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
