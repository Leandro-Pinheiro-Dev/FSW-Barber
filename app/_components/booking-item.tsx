"use client";

import { isFuture } from "date-fns";

import Link from "next/link";

interface BookingItemProps {
  booking: {
    id: string;
    date: Date;
    service: {
      name: string;
      price: number;
    };
    bookingItems?: {
      id: string;
      name: string;
      price: number;
      service?: {
        name: string;
        price: number;
      };
      barbershopName?: string;
      barbershopImage?: string;
    }[];
  };
}
// =====================================================
// FORMATAR DATA/HORA NO FUSO DO BRASIL
// =====================================================

const formatBrazilDate = (date: Date, options: Intl.DateTimeFormatOptions) => {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    ...options,
  }).format(new Date(date));
};

// =====================================================
// COMPONENTE
// =====================================================

const BookingItem = ({ booking }: BookingItemProps) => {
  console.log("BOOKING CLIENTE:", {
    id: booking.id,
    date: booking.date,
    iso: new Date(booking.date).toISOString(),
    brazil: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(booking.date)),
  });
  const isConfirmed = isFuture(booking.date);

  // ---------------------------------------------------
  // DATA COMPLETA
  // Exemplo: terça-feira, 15 de setembro
  // ---------------------------------------------------

  const formattedFullDate = formatBrazilDate(booking.date, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // ---------------------------------------------------
  // MÊS
  // Exemplo: set.
  // ---------------------------------------------------

  const formattedMonth = formatBrazilDate(booking.date, {
    month: "short",
  });

  // ---------------------------------------------------
  // DIA
  // Exemplo: 15
  // ---------------------------------------------------

  const formattedDay = formatBrazilDate(booking.date, {
    day: "2-digit",
  });

  // ---------------------------------------------------
  // HORÁRIO
  // Exemplo: 11:00
  // ---------------------------------------------------

  const formattedTime = formatBrazilDate(booking.date, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  // ---------------------------------------------------
  // SERVIÇOS
  // ---------------------------------------------------

  const services =
    booking.bookingItems && booking.bookingItems.length > 0
      ? booking.bookingItems.map((item) => item.name).join(", ")
      : booking.service.name;

  // ---------------------------------------------------
  // VALOR TOTAL
  // ---------------------------------------------------

  const totalPrice =
    booking.bookingItems && booking.bookingItems.length > 0
      ? booking.bookingItems.reduce(
          (total, item) => total + Number(item.price),
          0,
        )
      : Number(booking.service.price);

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
      {/* =================================================
          CABEÇALHO
      ================================================= */}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{services}</h3>

          <p className="mt-1 text-sm text-muted-foreground">
            R$ {totalPrice.toFixed(2).replace(".", ",")}
          </p>
        </div>

        {/* =================================================
            STATUS
        ================================================= */}

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            isConfirmed
              ? "bg-green-100 text-green-700"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isConfirmed ? "Agendado" : "Concluído"}
        </span>
      </div>

      {/* =================================================
          DATA E HORÁRIO
      ================================================= */}

      <div className="flex items-center gap-3">
        {/* CALENDÁRIO */}

        <div className="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-lg border bg-background">
          <div className="w-full bg-muted px-2 py-1 text-center">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {formattedMonth}
            </p>
          </div>

          <div className="px-2 py-2">
            <p className="text-2xl font-bold leading-none">{formattedDay}</p>
          </div>
        </div>

        {/* INFORMAÇÕES */}

        <div className="min-w-0">
          <p className="text-sm font-medium capitalize">{formattedFullDate}</p>

          <p className="mt-1 text-sm font-semibold">{formattedTime}</p>
        </div>
      </div>

      {/* =================================================
          LINK PARA DETALHES
      ================================================= */}

      <Link
        href={`/bookings/${booking.id}`}
        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Ver detalhes
      </Link>
    </div>
  );
};

export default BookingItem;
