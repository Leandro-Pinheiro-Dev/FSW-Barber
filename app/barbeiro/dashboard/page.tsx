import { getServerSession } from "next-auth";

import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

import { db } from "@/lib/prisma";

// =====================================================
// COMPONENTES DO DASHBOARD
// =====================================================

import EditServiceButton from "./_components/edit-service-button";
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
  // DATA ATUAL
  // =====================================================

  const now = new Date();

  const currentMonth = now.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // =====================================================
  // RENDERIZAÇÃO
  // =====================================================

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* =================================================
            CABEÇALHO
        ================================================= */}

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

        {/* =================================================
            RESUMO FINANCEIRO
        ================================================= */}

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Resumo financeiro</h2>

            <p className="text-sm text-zinc-500">
              Entradas registradas no sistema.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* =============================================
                FATURAMENTO HOJE
            ============================================= */}

            <div className="rounded-2xl border border-green-900/50 bg-linear-to-br from-green-950/40 to-zinc-900 p-6 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Recebido hoje
                  </p>

                  <p className="mt-3 text-3xl font-bold text-green-400">
                    R$ {dashboardSummary.dailyRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl bg-green-500/10 p-3 text-xl">💰</div>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Serviços + pagamentos de fiado
              </p>
            </div>

            {/* =============================================
                FATURAMENTO MÊS
            ============================================= */}

            <div className="rounded-2xl border border-blue-900/50 bg-linear-to-br from-blue-950/40 to-zinc-900 p-6 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium capitalize text-zinc-400">
                    {currentMonth}
                  </p>

                  <p className="mt-3 text-3xl font-bold text-blue-400">
                    R$ {dashboardSummary.monthlyRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-500/10 p-3 text-xl">📊</div>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Total recebido no mês
              </p>
            </div>

            {/* =============================================
                FIADO EM ABERTO
            ============================================= */}

            <div className="rounded-2xl border border-red-900/50 bg-linear-to-br from-red-950/40 to-zinc-900 p-6 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Fiado em aberto
                  </p>

                  <p className="mt-3 text-3xl font-bold text-red-400">
                    R$ {dashboardSummary.totalDebt.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl bg-red-500/10 p-3 text-xl">💳</div>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                {dashboardSummary.customersWithDebt}{" "}
                {dashboardSummary.customersWithDebt === 1
                  ? "cliente com dívida"
                  : "clientes com dívida"}
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            DETALHAMENTO FINANCEIRO
        ================================================= */}

        <section className="mb-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* SERVIÇOS */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">
                    Serviços recebidos hoje
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    R$ {dashboardSummary.dailyServiceRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-800 p-3">✂️</div>
              </div>
            </div>

            {/* FIADOS PAGOS */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Fiados recebidos hoje</p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    R$ {dashboardSummary.dailyDebtRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-800 p-3">💳</div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            INDICADORES
        ================================================= */}

        <section className="mb-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* AGENDAMENTOS */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Agendamentos</p>

              <p className="mt-2 text-3xl font-bold">{bookings.length}</p>

              <p className="mt-1 text-xs text-zinc-600">
                Agendamentos registrados
              </p>
            </div>

            {/* CLIENTES */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Clientes</p>

              <p className="mt-2 text-3xl font-bold">{users.length}</p>

              <p className="mt-1 text-xs text-zinc-600">Clientes cadastrados</p>
            </div>

            {/* SERVIÇOS */}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Serviços</p>

              <p className="mt-2 text-3xl font-bold">{services.length}</p>

              <p className="mt-1 text-xs text-zinc-600">Serviços disponíveis</p>
            </div>
          </div>
        </section>

        {/* =================================================
    SERVIÇOS E PREÇOS
================================================= */}

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl sm:p-6">
          {/* CABEÇALHO */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Serviços e preços</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Atualize os valores cobrados pelos serviços da barbearia.
            </p>
          </div>

          {/* LISTA DE SERVIÇOS */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
              >
                {/* INFORMAÇÕES */}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {service.name}
                  </p>

                  <p className="mt-1 text-lg font-bold text-green-400">
                    R$ {service.price.toFixed(2)}
                  </p>
                </div>

                {/* EDITAR */}
                <EditServiceButton service={service} />
              </div>
            ))}
          </div>
        </section>

        {/* =================================================
            AGENDAMENTOS
        ================================================= */}

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl sm:p-6">
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

          {/* =================================================
              NENHUM AGENDAMENTO
          ================================================= */}

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
            /* =================================================
               LISTA DE AGENDAMENTOS
            ================================================= */

            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* CLIENTE */}

                    <div className="min-w-0 lg:w-44">
                      <p className="truncate font-semibold text-white">
                        {booking.user?.name ?? booking.clientName ?? "Cliente"}
                      </p>

                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {booking.user?.email ??
                          booking.clientPhone ??
                          "Cliente manual"}
                      </p>
                    </div>

                    {/* SERVIÇO */}

                    <div className="lg:w-36">
                      <p className="font-medium text-white">
                        {booking.service.name}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        R$ {Number(booking.service.price).toFixed(2)}
                      </p>
                    </div>

                    {/* DATA */}

                    <div className="lg:w-32">
                      <p className="font-medium text-white">
                        {new Date(booking.date).toLocaleDateString("pt-BR")}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {new Date(booking.date).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* STATUS */}

                    <div>
                      <BookingStatusButton
                        bookingId={booking.id}
                        status={booking.status}
                      />
                    </div>

                    {/* AÇÕES */}

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

        {/* =================================================
            AGENDA DO BARBEIRO
        ================================================= */}

        <section className="mb-8">
          <BarberSchedule users={users} services={services} />
        </section>

        {/* =================================================
            CLIENTES COM DÍVIDAS
        ================================================= */}

        <section className="mb-8">
          <CustomerDebts users={users} />
        </section>
      </div>
    </main>
  );
};

export default BarberDashboardPage;
