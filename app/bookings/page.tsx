import { db } from "@/lib/prisma";
import Header from "../_components/header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import BookingItem from "../_components/booking-item";
import LoginRequiredDialog from "../_components/login-required-dialog";

const Bookings = async () => {
  const session = await getServerSession(authOptions);

  // =====================================================
  // USUÁRIO NÃO AUTENTICADO
  // =====================================================

  if (!session?.user) {
    return (
      <>
        <Header />
        <LoginRequiredDialog />
      </>
    );
  }

  // =====================================================
  // AGENDAMENTOS CONFIRMADOS
  // PENDING + CONFIRMED
  // =====================================================

  const confirmedBookings = await db.booking.findMany({
    where: {
      userId: session.user.id,
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
    },

    include: {
      bookingItems: {
        include: {
          service: {
            include: {
              barbershop: true,
            },
          },
        },
      },

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
  // FORMATAR AGENDAMENTOS CONFIRMADOS
  // =====================================================

  const confirmedBookingsFormatted = confirmedBookings.map((booking) => ({
    id: booking.id,

    date: booking.date,

    // IMPORTANTE:
    // O status real vem do banco.
    status: booking.status,

    // Valores financeiros OFICIAIS salvos no Booking.
    subtotal: Number(booking.subtotal),
    discount: Number(booking.discount),
    total: Number(booking.total),

    service: {
      id: booking.service.id,
      name: booking.service.name,
      price: Number(booking.service.price),

      barbershop: {
        name: booking.service.barbershop.name,
        image: booking.service.barbershop.imageUrl,
      },
    },

    // Serviços do agendamento.
    bookingItems: booking.bookingItems.map((item) => ({
      id: item.id,

      name: item.service.name,

      price: Number(item.price),

      barbershopName: item.service.barbershop.name,

      barbershopImage: item.service.barbershop.imageUrl,
    })),
  }));

  // =====================================================
  // AGENDAMENTOS FINALIZADOS
  // COMPLETED
  // =====================================================

  const concludedBookings = await db.booking.findMany({
    where: {
      userId: session.user.id,
      status: "COMPLETED",
    },

    include: {
      bookingItems: {
        include: {
          service: {
            include: {
              barbershop: true,
            },
          },
        },
      },

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
  // FORMATAR AGENDAMENTOS FINALIZADOS
  // =====================================================

  const concludedBookingsFormatted = concludedBookings.map((booking) => ({
    id: booking.id,

    date: booking.date,

    // IMPORTANTE:
    // Também precisamos enviar o status aqui.
    status: booking.status,

    // Valores financeiros OFICIAIS salvos no Booking.
    subtotal: Number(booking.subtotal),
    discount: Number(booking.discount),
    total: Number(booking.total),

    service: {
      id: booking.service.id,
      name: booking.service.name,
      price: Number(booking.service.price),

      barbershop: {
        name: booking.service.barbershop.name,
        image: booking.service.barbershop.imageUrl,
      },
    },

    // Serviços do agendamento.
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
        <h1 className="mb-6 text-xl font-bold">MEUS AGENDAMENTOS</h1>

        {/* =================================================
            CONFIRMADOS
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
            FINALIZADOS
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
