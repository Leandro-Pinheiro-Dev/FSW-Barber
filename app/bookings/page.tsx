import { db } from "@/lib/prisma";

import Header from "../_components/header";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import BookingItem from "../_components/booking-item";

import LoginRequiredDialog from "../_components/login-required-dialog";

const Bookings = async () => {
  const session = await getServerSession(authOptions);

  // =====================================================
  // USUÁRIO NÃO LOGADO
  // =====================================================

  if (!session?.user) {
    return (
      <>
        <Header />
        <LoginRequiredDialog />
      </>
    );
  }

  const now = new Date();

  // =====================================================
  // AGENDAMENTOS FUTUROS
  // =====================================================

  const confirmedBookings = await db.booking.findMany({
    where: {
      userId: session.user.id,

      date: {
        gte: now,
      },

      status: {
        not: "CANCELLED",
      },
    },

    include: {
      // =================================================
      // SERVIÇOS DO NOVO SISTEMA
      // =================================================

      bookingItems: {
        include: {
          service: {
            include: {
              barbershop: true,
            },
          },
        },
      },

      // =================================================
      // SERVIÇO ANTIGO
      //
      // Mantido para compatibilidade com agendamentos
      // criados antes do sistema de múltiplos serviços.
      // =================================================

      service: {
        include: {
          barbershop: true,
        },
      },
    },

    orderBy: {
      date: "asc",
    },
  });

  // =====================================================
  // FORMATAR AGENDAMENTOS FUTUROS
  //
  // Aqui:
  // - Decimal -> number
  // - bookingItems -> formato usado pelo BookingItem
  // =====================================================

  const confirmedBookingsFormatted = confirmedBookings.map((booking) => ({
    id: booking.id,

    date: booking.date,

    service: {
      id: booking.service.id,

      name: booking.service.name,

      price: Number(booking.service.price),

      barbershop: {
        name: booking.service.barbershop.name,

        imageUrl: booking.service.barbershop.imageUrl,
      },
    },

    bookingItems: booking.bookingItems.map((item) => ({
      id: item.id,

      name: item.service.name,

      price: Number(item.price),

      barbershopName: item.service.barbershop.name,

      barbershopImage: item.service.barbershop.imageUrl,
    })),
  }));

  // =====================================================
  // AGENDAMENTOS CONCLUÍDOS / PASSADOS
  // =====================================================

  const concludedBookings = await db.booking.findMany({
    where: {
      userId: session.user.id,

      date: {
        lt: now,
      },

      status: {
        not: "CANCELLED",
      },
    },

    include: {
      // =================================================
      // SERVIÇOS DO NOVO SISTEMA
      // =================================================

      bookingItems: {
        include: {
          service: {
            include: {
              barbershop: true,
            },
          },
        },
      },

      // =================================================
      // SERVIÇO ANTIGO
      // =================================================

      service: {
        include: {
          barbershop: true,
        },
      },
    },

    orderBy: {
      date: "desc",
    },
  });

  // =====================================================
  // FORMATAR AGENDAMENTOS CONCLUÍDOS
  // =====================================================

  const concludedBookingsFormatted = concludedBookings.map((booking) => ({
    id: booking.id,

    date: booking.date,

    service: {
      id: booking.service.id,

      name: booking.service.name,

      price: Number(booking.service.price),

      barbershop: {
        name: booking.service.barbershop.name,

        imageUrl: booking.service.barbershop.imageUrl,
      },
    },

    bookingItems: booking.bookingItems.map((item) => ({
      id: item.id,

      name: item.service.name,

      price: Number(item.price),

      barbershopName: item.service.barbershop.name,

      barbershopImage: item.service.barbershop.imageUrl,
    })),
  }));

  // =====================================================
  // TELA
  // =====================================================

  return (
    <>
      <Header />

      <div className="mx-auto w-full max-w-5xl p-5">
        {/* =================================================
            TÍTULO
        ================================================= */}

        <h1 className="mb-6 text-xl font-bold">MEUS AGENDAMENTOS</h1>

        {/* =================================================
            AGENDAMENTOS CONFIRMADOS
        ================================================= */}

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
            Confirmados
          </h2>

          {confirmedBookingsFormatted.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
              {confirmedBookingsFormatted.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você não possui agendamentos confirmados.
            </p>
          )}
        </div>

        {/* =================================================
            AGENDAMENTOS FINALIZADOS
        ================================================= */}

        <div className="mt-8">
          <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
            Finalizados
          </h2>

          {concludedBookingsFormatted.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
              {concludedBookingsFormatted.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum agendamento finalizado.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default Bookings;
