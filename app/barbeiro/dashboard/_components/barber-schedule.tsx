"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { toast } from "sonner";

import { getBarberSchedule } from "@/app/_actions/get-barber-schedule";

import CreateBookingButton from "./create-booking-button";
import EditBookingButton from "./edit-booking-button";
import DeleteBookingButton from "./delete-booking-button";
import CreateDebtButton from "./create-debt-button";

// =====================================================
// TIPOS
// =====================================================

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Booking {
  id: string;
  userId: string | null;
  serviceId: string;
  date: Date;
  serviceName: string;
  clientName: string | null;
  clientPhone?: string | null;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
}

interface FixedSchedule {
  id: string;
  time: string;
  clientName: string;
}

interface BarberScheduleProps {
  initialDate?: Date;
  users: User[];
  services: Service[];
}

// =====================================================
// HORÁRIOS
// =====================================================

const TIME_LIST = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

// =====================================================
// COMPONENTE
// =====================================================

const BarberSchedule = ({
  initialDate = new Date(),
  users,
  services,
}: BarberScheduleProps) => {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [fixedSchedules, setFixedSchedules] = useState<FixedSchedule[]>([]);

  const [isPending, startTransition] = useTransition();

  // =====================================================
  // TRANSFORMAR DATA PARA YYYY-MM-DD
  // =====================================================

  const formatDateForServer = (date: Date) => {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // CRIAR DATA LOCAL COM HORÁRIO
  // =====================================================

  const createLocalDateWithTime = (date: Date, time: string) => {
    const [hours, minutes] = time.split(":").map(Number);

    const result = new Date(date);

    result.setHours(hours, minutes, 0, 0);

    return result;
  };

  // =====================================================
  // CARREGAR AGENDA
  // =====================================================

  const loadSchedule = useCallback((date: Date) => {
    const dateString = formatDateForServer(date);

    startTransition(async () => {
      try {
        console.log("Consultando agenda:", dateString);

        const result = await getBarberSchedule(dateString);

        setBookings(result.bookings);

        setFixedSchedules(result.fixedSchedules);
      } catch (error) {
        console.error("ERRO AO CARREGAR AGENDA:", error);

        toast.error("Não foi possível carregar a agenda.");

        setBookings([]);

        setFixedSchedules([]);
      }
    });
  }, []);
  // =====================================================
  // CARREGAR QUANDO A DATA MUDAR
  // =====================================================

  useEffect(() => {
    loadSchedule(selectedDate);
  }, [selectedDate, loadSchedule]);

  // =====================================================
  // ALTERAR DIA
  // =====================================================

  const changeDay = (days: number) => {
    const newDate = new Date(selectedDate);

    newDate.setDate(newDate.getDate() + days);

    setSelectedDate(newDate);
  };

  // =====================================================
  // VOLTAR PARA HOJE
  // =====================================================

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // =====================================================
  // FORMATAR DATA NA TELA
  // =====================================================

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // =====================================================
  // ENCONTRAR AGENDAMENTO
  // =====================================================

  const getBookingByTime = (time: string) => {
    return bookings.find((booking) => {
      const bookingDate = new Date(booking.date);

      const bookingTime = bookingDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      return bookingTime === time;
    });
  };

  // =====================================================
  // ENCONTRAR HORÁRIO FIXO
  // =====================================================

  const getFixedScheduleByTime = (time: string) => {
    return fixedSchedules.find((schedule) => schedule.time === time);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-xl">
      {/* =================================================
          CABEÇALHO
      ================================================= */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Agenda</h2>

          <p className="mt-1 text-sm capitalize text-zinc-400">
            {formatDate(selectedDate)}
          </p>
        </div>

        {/* NAVEGAÇÃO */}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeDay(-1)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800"
          >
            ←
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800"
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => changeDay(1)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800"
          >
            →
          </button>
        </div>
      </div>

      {/* =================================================
          SCROLL DOS HORÁRIOS
      ================================================= */}

      <div className="max-h-162.5 space-y-3 overflow-y-auto pr-2">
        {TIME_LIST.map((time) => {
          const booking = getBookingByTime(time);

          const fixedSchedule = getFixedScheduleByTime(time);

          return (
            <div
              key={time}
              className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:flex-row md:items-center"
            >
              {/* HORÁRIO */}

              <div className="w-20 shrink-0 text-lg font-bold">{time}</div>

              {/* =================================================
                  HORÁRIO FIXO
              ================================================= */}

              {fixedSchedule ? (
                <div className="flex-1">
                  <p className="font-semibold text-red-400">
                    {fixedSchedule.clientName}
                  </p>

                  <p className="text-sm text-zinc-500">Horário fixo</p>
                </div>
              ) : booking ? (
                /* =================================================
                   AGENDAMENTO
                ================================================= */

                <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  {/* CLIENTE */}

                  <div>
                    <p className="font-semibold text-white">
                      {booking.clientName}
                    </p>

                    <p className="text-sm text-zinc-400">
                      {booking.serviceName}
                    </p>
                  </div>

                  {/* STATUS */}

                  <div>
                    {booking.status === "PENDING" && (
                      <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400">
                        Pendente
                      </span>
                    )}

                    {booking.status === "CONFIRMED" && (
                      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                        Confirmado
                      </span>
                    )}

                    {booking.status === "COMPLETED" && (
                      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                        Concluído
                      </span>
                    )}

                    {booking.status === "CANCELLED" && (
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                        Cancelado
                      </span>
                    )}
                  </div>

                  {/* AÇÕES */}

                  <div className="flex flex-wrap gap-2">
                    <CreateDebtButton
                      userId={booking.userId}
                      bookingId={booking.id}
                      amount={Number(
                        services.find(
                          (service) => service.id === booking.serviceId,
                        )?.price ?? 0,
                      )}
                      serviceName={booking.serviceName}
                    />

                    <EditBookingButton
                      booking={{
                        id: booking.id,
                        userId: booking.userId,
                        clientName: booking.clientName,
                        clientPhone: booking.clientPhone ?? null,
                        serviceId: booking.serviceId,
                        date: booking.date,
                      }}
                      users={users}
                      services={services}
                    />

                    <DeleteBookingButton bookingId={booking.id} />
                  </div>
                </div>
              ) : (
                /* =================================================
                   HORÁRIO DISPONÍVEL
                ================================================= */

                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-green-400">Disponível</p>

                    <p className="text-sm text-zinc-500">Horário livre</p>
                  </div>

                  <CreateBookingButton
                    users={users}
                    services={services}
                    initialDate={createLocalDateWithTime(selectedDate, time)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =================================================
          CARREGANDO
      ================================================= */}

      {isPending && (
        <p className="mt-4 text-center text-sm text-zinc-500">
          Atualizando agenda...
        </p>
      )}
    </div>
  );
};

export default BarberSchedule;
