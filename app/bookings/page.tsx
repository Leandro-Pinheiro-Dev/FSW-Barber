import { db } from "@/lib/prisma";
import Header from "../_components/header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import BookingItem from "../_components/booking-item";
import LoginRequiredDialog from "../_components/login-required-dialog";

const Bookings = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <>
        <Header />
        <LoginRequiredDialog />
      </>
    );
  }

  const now = new Date();

  const confirmedBookings = await db.booking.findMany({
    where: {
      userId: session.user.id,
      date: {
        gte: now,
      },
    },
    include: {
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

  const concludedBookings = await db.booking.findMany({
    where: {
      userId: session.user.id,
      date: {
        lt: now,
      },
    },
    include: {
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

  return (
    <>
      <Header />

      <div className="mx-auto w-full max-w-5xl p-5">
        <h1 className="mb-6 text-xl font-bold">Agendamentos</h1>

        {/* AGENDAMENTOS CONFIRMADOS */}
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
            Confirmados
          </h2>

          {confirmedBookings.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
              {confirmedBookings.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você não possui agendamentos confirmados.
            </p>
          )}
        </div>

        {/* AGENDAMENTOS FINALIZADOS */}
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
            Finalizados
          </h2>

          {concludedBookings.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
              {concludedBookings.map((booking) => (
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
