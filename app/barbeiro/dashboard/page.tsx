import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// =====================================================
// COMPONENTES DO DASHBOARD
// =====================================================

import EditBookingButton from "./_components/edit-booking-button";
import DeleteBookingButton from "./_components/delete-booking-button";
import CreateBookingButton from "./_components/create-booking-button";
import BarberSchedule from "./_components/barber-schedule";
import BookingStatusButton from "./_components/booking-status-button";
import CustomerDebts from "./_components/customer-debts";
import LogoutButton from "./_components/logout-button";

// =====================================================
// ACTION PARA RESUMO FINANCEIRO
// =====================================================

import { getDashboardSummary } from "@/app/_actions/get-dashboard-summary";

// =====================================================
// PÁGINA DO DASHBOARD DO BARBEIRO
// =====================================================

const BarberDashboardPage = async () => {
  // =====================================================
  // 1. VERIFICAR USUÁRIO LOGADO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // =====================================================
  // 2. VERIFICAR SE É BARBEIRO
  // =====================================================

  if (session.user.role !== "BARBER") {
    redirect("/");
  }

  // =====================================================
  // 3. RESUMO DO DASHBOARD
  // =====================================================

  const dashboardSummary = await getDashboardSummary();

  // =====================================================
  // 4. BUSCAR AGENDAMENTOS
  // =====================================================

  const bookings = await db.booking.findMany({
    include: {
      user: true,
      service: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  // =====================================================
  // 5. BUSCAR CLIENTES
  // =====================================================

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

  // =====================================================
  // 6. BUSCAR SERVIÇOS
  // =====================================================

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

  // =====================================================
  // 7. CONVERTER DECIMAL PARA NUMBER
  // =====================================================

  const services = servicesData.map((service) => ({
    id: service.id,
    name: service.name,
    price: Number(service.price),
  }));

  // =====================================================
  // 8. RENDERIZAÇÃO
  // =====================================================

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        {/* =====================================================
            CABEÇALHO
        ===================================================== */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Painel do Barbeiro
            </h1>

            <p className="mt-2 text-zinc-400">
              Olá, {session.user.name ?? "Barbeiro"}!
            </p>
          </div>

          {/* BOTÃO SAIR */}

          <LogoutButton />
        </div>

        {/* =====================================================
            CARDS DO DASHBOARD
        ===================================================== */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* AGENDAMENTOS */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
            <p className="text-sm text-zinc-400">Agendamentos</p>

            <p className="mt-2 text-3xl font-bold text-white">
              {bookings.length}
            </p>
          </div>

          {/* CLIENTES */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
            <p className="text-sm text-zinc-400">Clientes</p>

            <p className="mt-2 text-3xl font-bold text-white">{users.length}</p>
          </div>

          {/* SERVIÇOS */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
            <p className="text-sm text-zinc-400">Serviços</p>

            <p className="mt-2 text-3xl font-bold text-white">
              {services.length}
            </p>
          </div>

          {/* FIADOS */}

          <div className="rounded-xl border border-red-900/50 bg-zinc-900 p-6 shadow-lg">
            <p className="text-sm text-zinc-400">Total em Fiados</p>

            <p className="mt-2 text-3xl font-bold text-red-400">
              R$ {dashboardSummary.totalDebt.toFixed(2)}
            </p>
          </div>

          {/* CLIENTES COM FIADO */}

          <div className="rounded-xl border border-yellow-900/50 bg-zinc-900 p-6 shadow-lg">
            <p className="text-sm text-zinc-400">Clientes com Fiado</p>

            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {dashboardSummary.customersWithDebt}
            </p>
          </div>

          {/* FATURAMENTO DO DIA */}

          <div className="rounded-xl border border-green-900/50 bg-zinc-900 p-6 shadow-lg">
            <p className="text-sm text-zinc-400">Faturamento do Dia</p>

            <p className="mt-2 text-3xl font-bold text-green-400">
              R$ {dashboardSummary.dailyRevenue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* =====================================================
            FATURAMENTO DO MÊS
        ===================================================== */}

        <div className="mb-8 rounded-xl border border-blue-900/50 bg-zinc-900 p-6 shadow-lg">
          <p className="text-sm text-zinc-400">Faturamento do Mês</p>

          <p className="mt-2 text-3xl font-bold text-blue-400">
            R$ {dashboardSummary.monthlyRevenue.toFixed(2)}
          </p>
        </div>

        {/* =====================================================
            AGENDAMENTOS
        ===================================================== */}

        <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
          {/* CABEÇALHO */}

          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Agendamentos</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Gerencie os horários dos seus clientes.
              </p>
            </div>

            <CreateBookingButton users={users} services={services} />
          </div>

          {/* =====================================================
              NENHUM AGENDAMENTO
          ===================================================== */}

          {bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
              <p className="text-zinc-400">Nenhum agendamento encontrado.</p>
            </div>
          ) : (
            /* =====================================================
               LISTA DE AGENDAMENTOS
            ===================================================== */

            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
                >
                  {/* =================================================
                      CLIENTE
                  ================================================= */}

                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      {booking.user?.name ?? booking.clientName ?? "Cliente"}
                    </p>

                    <p className="truncate text-sm text-zinc-500">
                      {booking.user?.email ??
                        booking.clientPhone ??
                        "Cliente manual"}
                    </p>
                  </div>

                  {/* =================================================
                      SERVIÇO
                  ================================================= */}

                  <div>
                    <p className="font-medium text-white">
                      {booking.service.name}
                    </p>

                    <p className="text-sm text-zinc-500">
                      R$ {Number(booking.service.price).toFixed(2)}
                    </p>
                  </div>

                  {/* =================================================
                      DATA E HORÁRIO
                  ================================================= */}

                  <div>
                    <p className="font-medium text-white">
                      {new Date(booking.date).toLocaleDateString("pt-BR")}
                    </p>

                    <p className="text-sm text-zinc-500">
                      {new Date(booking.date).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* =================================================
                      STATUS
                  ================================================= */}

                  <BookingStatusButton
                    bookingId={booking.id}
                    status={booking.status}
                  />

                  {/* =================================================
                      AÇÕES
                  ================================================= */}

                  <div className="flex flex-wrap gap-2">
                    {/* EDITAR */}

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

                    {/* EXCLUIR */}

                    <DeleteBookingButton bookingId={booking.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =====================================================
            AGENDA DO BARBEIRO
        ===================================================== */}

        <section className="mb-8">
          <BarberSchedule users={users} services={services} />
        </section>

        {/* =====================================================
            CLIENTES COM DÍVIDAS / FIADO
        ===================================================== */}

        <section className="mb-8">
          <CustomerDebts users={users} />
        </section>
      </div>
    </main>
  );
};

export default BarberDashboardPage;
