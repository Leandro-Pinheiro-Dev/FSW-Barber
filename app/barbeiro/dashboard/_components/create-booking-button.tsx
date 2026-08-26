"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { createBookingByBarber } from "@/app/_actions/create-booking-by-barber";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Service {
  id: string;
  name: string;
}

interface CreateBookingButtonProps {
  users: User[];
  services: Service[];
  initialDate?: Date;
}

type ClientType = "registered" | "manual";

const CreateBookingButton = ({
  users,
  services,
  initialDate,
}: CreateBookingButtonProps) => {
  const [open, setOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const [clientType, setClientType] = useState<ClientType>("registered");

  const [userId, setUserId] = useState("");

  const [clientName, setClientName] = useState("");

  const [clientPhone, setClientPhone] = useState("");

  const [serviceId, setServiceId] = useState("");

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

  // =====================================================
  // FORMATAR DATA
  // =====================================================

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // ABRIR MODAL
  // =====================================================

  const handleOpen = () => {
    setUserId(users[0]?.id ?? "");
    setServiceId(services[0]?.id ?? "");

    if (initialDate) {
      setDate(formatDateForInput(initialDate));

      setTime(
        initialDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    } else {
      const now = new Date();

      setDate(formatDateForInput(now));

      setTime(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    }

    setOpen(true);
  };

  // =====================================================
  // CRIAR AGENDAMENTO
  // =====================================================

  const handleCreate = () => {
    if (!serviceId || !date || !time) {
      toast.error("Preencha todos os campos obrigatórios.");

      return;
    }

    // ===================================================
    // CLIENTE CADASTRADO
    // ===================================================

    if (clientType === "registered" && !userId) {
      toast.error("Selecione um cliente cadastrado.");

      return;
    }

    // ===================================================
    // CLIENTE MANUAL
    // ===================================================

    if (clientType === "manual" && !clientName.trim()) {
      toast.error("Informe o nome do cliente.");

      return;
    }

    // ===================================================
    // DATA
    // ===================================================

    const selectedDate = new Date(`${date}T${time}:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      toast.error("Data ou horário inválido.");

      return;
    }

    startTransition(async () => {
      try {
        await createBookingByBarber({
          serviceId,

          date: selectedDate,

          userId: clientType === "registered" ? userId : undefined,

          clientName: clientType === "manual" ? clientName.trim() : undefined,

          clientPhone:
            clientType === "manual"
              ? clientPhone.trim() || undefined
              : undefined,
        });

        toast.success("Agendamento criado com sucesso.");

        setOpen(false);

        window.location.reload();
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Não foi possível criar o agendamento.");
        }
      }
    });
  };

  // =====================================================
  // BOTÃO NOVO AGENDAMENTO
  // =====================================================

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
      >
        + Novo agendamento
      </button>
    );
  }

  // =====================================================
  // MODAL
  // =====================================================

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl">
        {/* =====================================================
            CABEÇALHO
        ===================================================== */}

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Novo agendamento</h2>

          <p className="mt-1 text-sm text-zinc-400">
            Preencha os dados do cliente e do atendimento.
          </p>
        </div>

        <div className="space-y-5">
          {/* =====================================================
              TIPO DE CLIENTE
          ===================================================== */}

          <div>
            <label className="mb-3 block text-sm font-medium text-zinc-300">
              Tipo de cliente
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* CLIENTE CADASTRADO */}

              <button
                type="button"
                onClick={() => {
                  setClientType("registered");
                  setClientName("");
                  setClientPhone("");
                }}
                className={`rounded-lg border p-3 text-sm font-medium transition ${
                  clientType === "registered"
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Cliente cadastrado
              </button>

              {/* CLIENTE MANUAL */}

              <button
                type="button"
                onClick={() => {
                  setClientType("manual");
                  setUserId("");
                }}
                className={`rounded-lg border p-3 text-sm font-medium transition ${
                  clientType === "manual"
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Cliente manual
              </button>
            </div>
          </div>

          {/* =====================================================
              CLIENTE CADASTRADO
          ===================================================== */}

          {clientType === "registered" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Cliente
              </label>

              <select
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-white"
              >
                <option value="" className="bg-zinc-950">
                  Selecione um cliente
                </option>

                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                    className="bg-zinc-950 text-white"
                  >
                    {user.name ?? user.email ?? "Cliente"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* =====================================================
              CLIENTE MANUAL
          ===================================================== */}

          {clientType === "manual" && (
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Nome do cliente
                </label>

                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Ex.: João da Silva"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white placeholder:text-zinc-600 outline-none transition focus:border-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Telefone
                  <span className="ml-1 text-xs text-zinc-500">(opcional)</span>
                </label>

                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white placeholder:text-zinc-600 outline-none transition focus:border-white"
                />
              </div>
            </div>
          )}

          {/* =====================================================
              SERVIÇO
          ===================================================== */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Serviço
            </label>

            <select
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-white"
            >
              <option value="" className="bg-zinc-950">
                Selecione um serviço
              </option>

              {services.map((service) => (
                <option
                  key={service.id}
                  value={service.id}
                  className="bg-zinc-950 text-white"
                >
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          {/* =====================================================
              DATA
          ===================================================== */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Data
            </label>

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-white"
            />
          </div>

          {/* =====================================================
              HORÁRIO
          ===================================================== */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Horário
            </label>

            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-white"
            />
          </div>
        </div>

        {/* =====================================================
            BOTÕES
        ===================================================== */}

        <div className="border-t border-zinc-800 bg-zinc-900 p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="rounded-lg bg-white px-5 py-2 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Agendando..." : "Agendar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBookingButton;
