"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getBusinessSchedule,
  updateBusinessDay,
  updateBusinessTimeSlot,
  type BusinessScheduleDay,
} from "@/app/barbeiro/dashboard/_actions/business-schedule";

// =====================================================
// NOMES DOS DIAS
// =====================================================

const DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

// =====================================================
// COMPONENTE
// =====================================================

export default function BusinessScheduleSettings() {
  const [schedule, setSchedule] = useState<BusinessScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // ===================================================
  // CARREGAR CONFIGURAÇÃO
  // ===================================================

  useEffect(() => {
    let mounted = true;

    async function loadSchedule() {
      try {
        const result = await getBusinessSchedule();

        if (mounted) {
          setSchedule(result);
        }
      } catch (error) {
        console.error(error);

        if (mounted) {
          toast.error("Não foi possível carregar a configuração da agenda.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      mounted = false;
    };
  }, []);

  // ===================================================
  // ENCONTRAR DIA
  // ===================================================

  const getDay = (dayOfWeek: number) => {
    return schedule.find((day) => day.dayOfWeek === dayOfWeek);
  };

  // ===================================================
  // ALTERAR DIA
  // ===================================================

  const handleDayToggle = (
    dayOfWeek: number,
    active: boolean,
  ) => {
    // Atualização otimista da interface
    setSchedule((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              active,
            }
          : day,
      ),
    );

    startTransition(async () => {
      try {
        await updateBusinessDay(dayOfWeek, active);

        toast.success(
          active
            ? "Dia aberto com sucesso."
            : "Dia fechado com sucesso.",
        );
      } catch (error) {
        console.error(error);

        // Recarrega o estado real caso dê erro
        const currentSchedule = await getBusinessSchedule();
        setSchedule(currentSchedule);

        toast.error("Não foi possível alterar o dia.");
      }
    });
  };

  // ===================================================
  // ALTERAR HORÁRIO
  // ===================================================

  const handleTimeToggle = (
    dayOfWeek: number,
    time: string,
    active: boolean,
  ) => {
    // Atualização otimista da interface
    setSchedule((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              timeSlots: day.timeSlots.map((slot) =>
                slot.time === time
                  ? {
                      ...slot,
                      active,
                    }
                  : slot,
              ),
            }
          : day,
      ),
    );

    startTransition(async () => {
      try {
        await updateBusinessTimeSlot(dayOfWeek, time, active);

        toast.success(
          active
            ? `${time} liberado.`
            : `${time} bloqueado.`,
        );
      } catch (error) {
        console.error(error);

        // Recarrega o estado real caso dê erro
        const currentSchedule = await getBusinessSchedule();
        setSchedule(currentSchedule);

        toast.error("Não foi possível alterar o horário.");
      }
    });
  };

  // ===================================================
  // CARREGANDO
  // ===================================================

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 w-56 rounded bg-zinc-800" />

          <div className="mt-2 h-4 w-80 rounded bg-zinc-800" />

          <div className="mt-6 h-32 rounded-xl bg-zinc-900" />
        </div>
      </section>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-xl">
      {/* =================================================
          CABEÇALHO
      ================================================= */}

      <div className="mb-6">
        <h2 className="text-xl font-bold">
          Configuração da Agenda
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Defina quais dias e horários ficam disponíveis para
          agendamento.
        </p>
      </div>

      {/* =================================================
          DIAS
      ================================================= */}

      <div className="space-y-4">
        {DAYS.map((day) => {
          const currentDay = getDay(day.value);

          if (!currentDay) {
            return (
              <div
                key={day.value}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <p className="font-semibold">{day.label}</p>

                <p className="mt-1 text-sm text-zinc-500">
                  Configuração não encontrada.
                </p>
              </div>
            );
          }

          return (
            <div
              key={day.value}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              {/* =================================================
                  CABEÇALHO DO DIA
              ================================================= */}

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold">
                    {day.label}
                  </h3>

                  <p
                    className={`mt-1 text-xs ${
                      currentDay.active
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {currentDay.active ? "ABERTO" : "FECHADO"}
                  </p>
                </div>

                {/* =================================================
                    BOTÃO ABRIR / FECHAR DIA
                ================================================= */}

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    handleDayToggle(
                      day.value,
                      !currentDay.active,
                    )
                  }
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    currentDay.active
                      ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {currentDay.active
                    ? "Fechar dia"
                    : "Abrir dia"}
                </button>
              </div>

              {/* =================================================
                  HORÁRIOS
              ================================================= */}

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {currentDay.timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={isPending || !currentDay.active}
                    onClick={() =>
                      handleTimeToggle(
                        day.value,
                        slot.time,
                        !slot.active,
                      )
                    }
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      slot.active
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    }`}
                  >
                    <span className="block">
                      {slot.time}
                    </span>

                    <span className="mt-0.5 block text-[10px] uppercase">
                      {slot.active ? "Livre" : "Bloqueado"}
                    </span>
                  </button>
                ))}
              </div>

              {/* =================================================
                  AVISO DIA FECHADO
              ================================================= */}

              {!currentDay.active && (
                <p className="mt-3 text-xs text-zinc-500">
                  O dia está fechado. Os horários permanecem
                  configurados, mas não ficam disponíveis para
                  novos agendamentos.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* =================================================
          AVISO FINAL
      ================================================= */}

      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm font-medium text-amber-300">
          Importante
        </p>

        <p className="mt-1 text-xs leading-5 text-zinc-400">
          Fechar um dia ou bloquear um horário não apaga nem
          cancela agendamentos existentes e também não altera
          horários fixos.
        </p>
      </div>
    </section>
  );
}
