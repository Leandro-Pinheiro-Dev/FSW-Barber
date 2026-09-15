import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

import EditServiceButton from "./_components/edit-service-button";
import EditBookingButton from "./_components/edit-booking-button";
import DeleteBookingButton from "./_components/delete-booking-button";
import CreateBookingButton from "./_components/create-booking-button";
import BarberSchedule from "./_components/barber-schedule";
import BookingStatusButton from "./_components/booking-status-button";
import CustomerDebts from "./_components/customer-debts";
import LogoutButton from "./_components/logout-button";

import { getDashboardSummary } from "@/app/_actions/get-dashboard-summary";

type DashboardBookingItem = {
  id: string;
  serviceId: string;
  name: string;
  price: number;
};

type DashboardBooking = {
  id: string;
  userId: string | null;
  serviceId: string;
  date: Date;
  clientName: string | null;
  clientPhone: string | null;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  serviceName: string;
  servicePrice: number;
  total: number;
  bookingItems: DashboardBookingItem[];
};

type DashboardService = {
  id: string;
  name: string;
  price: number;
};

const BarberDashboardPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "BARBER") {
    redirect("/");
  }

  const dashboardSummary = await getDashboardSummary();

  const bookingsData = await db.booking.findMany({
    include: {
      user: true,
      service: true,
      bookingItems: {
        include: {
          service: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const bookings: DashboardBooking[] = bookingsData.map((booking) => {
    const items = booking.bookingItems as Array<{
      id: string;
      serviceId: string;
      price: unknown;
      service: {
        id: string;
        name: string;
        price: unknown;
      };
    }>;

    const bookingItems: DashboardBookingItem[] =
      items.length > 0
        ? items.map((item): DashboardBookingItem => ({
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

    const total: number = bookingItems.reduce(
      (sum: number, item: DashboardBookingItem) => sum + item.price,
      0,
    );

    const serviceName: string = bookingItems
      .map((item: DashboardBookingItem) => item.name)
      .join(" + ");

    return {
      id: booking.id,
      userId: booking.userId,
      serviceId: booking.serviceId,
      date: booking.date,
      clientName: booking.clientName ?? booking.user?.name ?? null,
      clientPhone: booking.clientPhone,
      status: booking.status,
      serviceName,
      servicePrice: Number(booking.service.price),
      total,
      bookingItems,
    };
  });

  const users = await db.user.findMany({
    where: {
      role: "CUSTOMER",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const servicesData = await db.barbershopService.findMany({
    select: {
      id: true,
      name: true,
      price: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const services: DashboardService[] = servicesData.map((service) => ({
    id: service.id,
    name: service.name,
    price: Number(service.price),
  }));

  const now = new Date();

  const currentMonth = now.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-zinc-500">
              Painel administrativo
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Olá, {session.user.name ?? "Barbeiro"} 👋
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Aqui está o resumo da sua barbearia.
            </p>
          </div>

          <LogoutButton />
        </header>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Resumo financeiro</h2>

            <p className="text-sm text-zinc-500">
              Entradas registradas no sistema.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-green-900/50 bg-linear-to-br from-green-950/40 to-zinc-900 p-6 shadow-lg">
              <p className="text-sm font-medium text-zinc-400">Recebido hoje</p>

              <p className="mt-3 text-3xl font-bold text-green-400">
                R$ {dashboardSummary.dailyRevenue.toFixed(2)}
              </p>

              <p className="mt-4 text-xs text-zinc-500">
                Serviços + pagamentos de fiado
              </p>
            </div>

            <div className="rounded-2xl border border-blue-900/50 bg-linear-to-br from-blue-950/40 to-zinc-900 p-6 shadow-lg">
              <p className="text-sm font-medium capitalize text-zinc-400">
                {currentMonth}
              </p>

              <p className="mt-3 text-3xl font-bold text-blue-400">
                R$ {dashboardSummary.monthlyRevenue.toFixed(2)}
              </p>

              <p className="mt-4 text-xs text-zinc-500">
                Total recebido no mês
              </p>
            </div>

            <div className="rounded-2xl border border-red-900/50 bg-linear-to-br from-red-950/40 to-zinc-900 p-6 shadow-lg">
              <p className="text-sm font-medium text-zinc-400">
                Fiado em aberto
              </p>

              <p className="mt-3 text-3xl font-bold text-red-400">
                R$ {dashboardSummary.totalDebt.toFixed(2)}
              </p>

              <p className="mt-4 text-xs text-zinc-500">
                {dashboardSummary.customersWithDebt}{" "}
                {dashboardSummary.customersWithDebt === 1
                  ? "cliente com dívida"
                  : "clientes com dívida"}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Serviços recebidos hoje</p>

              <p className="mt-2 text-2xl font-bold text-white">
                R$ {dashboardSummary.dailyServiceRevenue.toFixed(2)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Fiados recebidos hoje</p>

              <p className="mt-2 text-2xl font-bold text-white">
                R$ {dashboardSummary.dailyDebtRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Agendamentos</p>
              <p className="mt-2 text-3xl font-bold">{bookings.length}</p>
              <p className="mt-1 text-xs text-zinc-600">
                Agendamentos registrados
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Clientes</p>
              <p className="mt-2 text-3xl font-bold">{users.length}</p>
              <p className="mt-1 text-xs text-zinc-600">Clientes cadastrados</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Serviços</p>
              <p className="mt-2 text-3xl font-bold">{services.length}</p>
              <p className="mt-1 text-xs text-zinc-600">Serviços disponíveis</p>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Serviços e preços</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Atualize os valores cobrados pelos serviços da barbearia.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {service.name}
                  </p>

                  <p className="mt-1 text-lg font-bold text-green-400">
                    R$ {service.price.toFixed(2)}
                  </p>
                </div>

                <EditServiceButton service={service} />
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl sm:p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Agendamentos</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Gerencie os horários dos seus clientes.
              </p>
            </div>

            <CreateBookingButton users={users} services={services} />
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center">
              <div className="mb-3 text-3xl">📅</div>

              <p className="font-medium text-zinc-300">
                Nenhum agendamento encontrado.
              </p>

              <p className="mt-1 text-sm text-zinc-600">
                Os novos agendamentos aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 lg:w-44">
                      <p className="truncate font-semibold text-white">
                        {booking.clientName ?? "Cliente não identificado"}
                      </p>

                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {booking.clientPhone ?? "Telefone não informado"}
                      </p>
                    </div>

                    <div className="min-w-0 lg:w-56">
                      <p className="mb-1 text-xs font-medium uppercase text-zinc-600">
                        Serviços
                      </p>

                      <div className="space-y-1">
                        {booking.bookingItems.map(
                          (item: DashboardBookingItem) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <p className="truncate font-medium text-white">
                                {item.name}
                              </p>

                              <span className="shrink-0 text-sm text-zinc-500">
                                R$ {item.price.toFixed(2)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>

                      {booking.bookingItems.length > 1 && (
                        <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-2">
                          <span className="text-xs text-zinc-500">Total</span>

                          <span className="font-bold text-green-400">
                            R$ {booking.total.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="lg:w-32">
                      <p className="font-medium text-white">
                        {new Date(booking.date).toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {new Date(booking.date).toLocaleTimeString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </p>
                    </div>

                    <div>
                      <BookingStatusButton
                        bookingId={booking.id}
                        status={booking.status}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <EditBookingButton
                        booking={{
                          id: booking.id,
                          userId: booking.userId,
                          clientName: booking.clientName,
                          clientPhone: booking.clientPhone,
                          serviceId: booking.serviceId,
                          date: booking.date,
                        }}
                        users={users}
                        services={services}
                      />

                      <DeleteBookingButton bookingId={booking.id} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <BarberSchedule users={users} services={services} />
        </section>

        <section className="mb-8">
          <CustomerDebts users={users} />
        </section>
      </div>
    </main>
  );
};

export default BarberDashboardPage;
