"use client";

import { useEffect, useState } from "react";

import { ChevronLeft, ChevronRight, History } from "lucide-react";

import { getMonthlyHistory } from "../_actions/get-monthly-history";

type MonthlyHistoryData = Awaited<ReturnType<typeof getMonthlyHistory>>;

const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatMonth = (year: number, month: number) => {
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const MonthlyHistory = () => {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [history, setHistory] = useState<MonthlyHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const data = await getMonthlyHistory({
          year,
          month,
        });

        if (!cancelled) {
          setHistory(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao carregar histórico mensal:", error);

        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const previousMonth = () => {
    setLoading(true);

    if (month === 1) {
      setMonth(12);
      setYear((currentYear) => currentYear - 1);
      return;
    }

    setMonth((currentMonth) => currentMonth - 1);
  };

  const nextMonth = () => {
    setLoading(true);

    if (month === 12) {
      setMonth(1);
      setYear((currentYear) => currentYear + 1);
      return;
    }

    setMonth((currentMonth) => currentMonth + 1);
  };

  return (
    <section className="mb-8 space-y-4">
      {/* =====================================================
          CABEÇALHO
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />

            <h2 className="text-xl font-bold">Histórico financeiro</h2>
          </div>

          <p className="mt-1 text-sm text-zinc-400">
            Consulte o movimento financeiro de cada mês.
          </p>
        </div>

        {/* =====================================================
            NAVEGAÇÃO DOS MESES
        ===================================================== */}

        <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-2">
          <button
            type="button"
            onClick={previousMonth}
            className="rounded-md p-2 transition hover:bg-zinc-800"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="min-w-[180px] text-center text-sm font-semibold capitalize">
            {formatMonth(year, month)}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            className="rounded-md p-2 transition hover:bg-zinc-800"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
          Carregando histórico...
        </div>
      )}

      {/* =====================================================
          DADOS
      ===================================================== */}

      {!loading && history && (
        <>
          {/* =================================================
              CARDS FINANCEIROS
          ================================================= */}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Total recebido</p>

              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(history.totalReceived)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Serviços recebidos</p>

              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(history.serviceRevenue)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Fiado recebido</p>

              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(history.debtRevenue)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Ticket médio</p>

              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(history.averageTicket)}
              </p>
            </div>
          </div>

          {/* =================================================
              RESUMO OPERACIONAL
          ================================================= */}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Agendamentos</p>

              <p className="mt-2 text-2xl font-bold">{history.totalBookings}</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Serviços concluídos</p>

              <p className="mt-2 text-2xl font-bold">
                {history.completedBookings}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Descontos</p>

              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(history.totalDiscounts)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Cancelados</p>

              <p className="mt-2 text-2xl font-bold">
                {history.cancelledBookings}
              </p>
            </div>
          </div>

          {/* =================================================
              MOVIMENTAÇÕES FINANCEIRAS
          ================================================= */}

          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 p-4">
              <h3 className="font-semibold">Movimentações financeiras</h3>
            </div>

            {history.transactions.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-400">
                Nenhuma movimentação financeira neste mês.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {history.transactions.map((transaction) => {
                  const isDebtPayment = transaction.type === "DEBT_PAYMENT";

                  return (
                    <div
                      key={transaction.id}
                      className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {isDebtPayment
                            ? "Pagamento de fiado"
                            : "Pagamento de serviço"}
                        </p>

                        <p className="text-sm text-zinc-400">
                          {transaction.clientName ||
                            transaction.description ||
                            "Cliente"}
                        </p>

                        <p className="text-xs text-zinc-500">
                          {formatDateTime(transaction.createdAt)}
                        </p>
                      </div>

                      <p className="font-semibold">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default MonthlyHistory;
