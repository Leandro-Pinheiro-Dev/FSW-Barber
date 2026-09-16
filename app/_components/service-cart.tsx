"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Calendar } from "./ui/calendar";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

import {
  CalendarDays,
  Check,
  Clock,
  Minus,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { createBooking } from "@/app/_actions/create-booking";
import { getBookings } from "@/app/_actions/get-bookings";
import { getFixedSchedules } from "@/app/_actions/get-fixed-schedules";

import { calculateBookingDiscount } from "@/app/utils/booking-discount";

// =====================================================
// TIPOS
// =====================================================

interface Service {
  id: string;
  name: string;
  price: number;
}

interface ServiceCartContextData {
  services: Service[];

  addService: (service: Service) => void;

  removeService: (serviceId: string) => void;

  clearCart: () => void;

  isInCart: (serviceId: string) => boolean;

  total: number;
}

// =====================================================
// CONTEXTO
// =====================================================

const ServiceCartContext = createContext<ServiceCartContextData | null>(null);

// =====================================================
// PROVIDER
// =====================================================

export function ServiceCartProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Service[]>([]);

  // ---------------------------------------------------
  // ADICIONAR SERVIÇO
  // ---------------------------------------------------

  const addService = (service: Service) => {
    setServices((currentServices) => {
      const alreadyExists = currentServices.some(
        (item) => item.id === service.id,
      );

      if (alreadyExists) {
        return currentServices;
      }

      return [...currentServices, service];
    });
  };

  // ---------------------------------------------------
  // REMOVER SERVIÇO
  // ---------------------------------------------------

  const removeService = (serviceId: string) => {
    setServices((currentServices) =>
      currentServices.filter((service) => service.id !== serviceId),
    );
  };

  // ---------------------------------------------------
  // LIMPAR CARRINHO
  // ---------------------------------------------------

  const clearCart = () => {
    setServices([]);
  };

  // ---------------------------------------------------
  // VERIFICAR SE ESTÁ NO CARRINHO
  // ---------------------------------------------------

  const isInCart = (serviceId: string) => {
    return services.some((service) => service.id === serviceId);
  };

  // ---------------------------------------------------
  // SUBTOTAL
  //
  // Mantemos "total" no contexto porque outros
  // componentes podem estar utilizando esse valor.
  //
  // O desconto é calculado separadamente pela função
  // calculateBookingDiscount().
  // ---------------------------------------------------

  const total = useMemo(() => {
    return services.reduce((sum, service) => sum + Number(service.price), 0);
  }, [services]);

  return (
    <ServiceCartContext.Provider
      value={{
        services,
        addService,
        removeService,
        clearCart,
        isInCart,
        total,
      }}
    >
      {children}
    </ServiceCartContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useServiceCart() {
  const context = useContext(ServiceCartContext);

  if (!context) {
    throw new Error(
      "useServiceCart deve ser utilizado dentro de ServiceCartProvider.",
    );
  }

  return context;
}

// =====================================================
// TIPOS DOS AGENDAMENTOS
// =====================================================

interface BookingData {
  date: Date;
}

// =====================================================
// TIPOS DOS HORÁRIOS FIXOS
//
// IMPORTANTE:
//
// getFixedSchedules() NÃO retorna o objeto completo
// FixedSchedule do Prisma.
//
// Ele retorna somente:
//
// {
//   clientName: string;
//   time: string;
// }
//
// Por isso não devemos tipar como FixedSchedule.
// =====================================================

interface FixedScheduleData {
  clientName: string;
  time: string;
}

// =====================================================
// HORÁRIOS DISPONÍVEIS
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
// COMPONENTE PRINCIPAL
// =====================================================

interface ServiceCartProps {
  barbershopId: string;
  barbershopName: string;
}

export function ServiceCart({
  barbershopId,
  barbershopName,
}: ServiceCartProps) {
  const { services, removeService, clearCart } = useServiceCart();

  // ---------------------------------------------------
  // ESTADOS
  // ---------------------------------------------------

  const [open, setOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>();

  const [selectedTime, setSelectedTime] = useState<string>();

  const [bookings, setBookings] = useState<BookingData[]>([]);

  const [fixedSchedules, setFixedSchedules] = useState<FixedScheduleData[]>([]);

  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [creatingBooking, setCreatingBooking] = useState(false);

  // ---------------------------------------------------
  // DATA MÍNIMA
  //
  // Não permitimos selecionar dias anteriores a hoje.
  // ---------------------------------------------------

  const today = useMemo(() => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }, []);

  // ---------------------------------------------------
  // DATA MÁXIMA
  //
  // Permite agendamento para até 60 dias.
  // ---------------------------------------------------

  const maxDate = useMemo(() => {
    const date = new Date(today);

    date.setDate(date.getDate() + 60);

    return date;
  }, [today]);

  // ===================================================
  // CALCULAR DESCONTO
  //
  // A regra fica centralizada em:
  //
  // utils/booking-discount.ts
  //
  // Assim o frontend não precisa duplicar a regra.
  // ===================================================

  const discountResult = useMemo(() => {
    return calculateBookingDiscount(
      services.map((service) => ({
        name: service.name,
        price: Number(service.price),
      })),
    );
  }, [services]);

  // ===================================================
  // SELECIONAR DATA
  //
  // IMPORTANTE:
  //
  // A busca dos horários acontece aqui, dentro do
  // evento do usuário.
  //
  // Isso evita o erro do React:
  //
  // "Calling setState synchronously within an effect"
  //
  // Também evita a necessidade de useEffect para
  // carregar disponibilidade.
  // ===================================================

  const handleSelectDate = async (date: Date | undefined) => {
    setSelectedDate(date);

    setSelectedTime(undefined);

    // Limpamos a disponibilidade anterior imediatamente.
    setBookings([]);

    setFixedSchedules([]);

    if (!date) {
      return;
    }

    try {
      setLoadingAvailability(true);

      // ------------------------------------------------
      // getDay():
      //
      // 0 = Domingo
      // 1 = Segunda
      // 2 = Terça
      // 3 = Quarta
      // 4 = Quinta
      // 5 = Sexta
      // 6 = Sábado
      // ------------------------------------------------

      const dayOfWeek = date.getDay();

      // ------------------------------------------------
      // BUSCAR AGENDAMENTOS E HORÁRIOS FIXOS
      //
      // getBookings recebe Date.
      //
      // getFixedSchedules recebe:
      // {
      //   barbershopId,
      //   dayOfWeek
      // }
      // ------------------------------------------------

      const [bookingsResult, fixedSchedulesResult] = await Promise.all([
        getBookings({
          date,
        }),

        getFixedSchedules({
          barbershopId,
          dayOfWeek,
        }),
      ]);

      setBookings(bookingsResult ?? []);

      setFixedSchedules(fixedSchedulesResult ?? []);
    } catch (error) {
      console.error("Erro ao carregar disponibilidade:", error);

      toast.error("Não foi possível carregar os horários.");
    } finally {
      setLoadingAvailability(false);
    }
  };

  // ===================================================
  // VERIFICAR SE HORÁRIO ESTÁ INDISPONÍVEL
  // ===================================================

  const isTimeUnavailable = (time: string) => {
    if (!selectedDate) {
      return false;
    }

    // -------------------------------------------------
    // 1. HORÁRIO FIXO
    //
    // getFixedSchedules já recebeu o dayOfWeek.
    //
    // Portanto aqui precisamos apenas verificar
    // se o horário existe.
    // -------------------------------------------------

    const fixedScheduleExists = fixedSchedules.some(
      (schedule) => schedule.time === time,
    );

    if (fixedScheduleExists) {
      return true;
    }

    // -------------------------------------------------
    // 2. AGENDAMENTO NORMAL
    //
    // Comparamos a data e o horário.
    // -------------------------------------------------

    const selectedDateString = format(selectedDate, "yyyy-MM-dd");

    const bookingExists = bookings.some((booking) => {
      const bookingDateString = format(new Date(booking.date), "yyyy-MM-dd");

      const bookingTime = format(new Date(booking.date), "HH:mm");

      return bookingDateString === selectedDateString && bookingTime === time;
    });

    return bookingExists;
  };

  // ===================================================
  // CRIAR AGENDAMENTO
  // ===================================================

  const handleCreateBooking = async () => {
    if (services.length === 0) {
      toast.error("Selecione pelo menos um serviço.");

      return;
    }

    if (!selectedDate) {
      toast.error("Selecione uma data para o agendamento.");

      return;
    }

    if (!selectedTime) {
      toast.error("Selecione um horário.");

      return;
    }

    if (isTimeUnavailable(selectedTime)) {
      toast.error("Este horário não está mais disponível.");

      return;
    }

    try {
      setCreatingBooking(true);

      // ------------------------------------------------
      // IMPORTANTE:
      //
      // Não enviamos desconto para o servidor.
      //
      // O createBooking calcula novamente o desconto
      // usando calculateBookingDiscount().
      // ------------------------------------------------

      const date = format(selectedDate, "yyyy-MM-dd");

      const result = await createBooking({
        serviceIds: services.map((service) => service.id),

        date,

        time: selectedTime,
      });

      // ------------------------------------------------
      // SUCESSO
      // ------------------------------------------------

      toast.success("Agendamento realizado com sucesso!");

      // Exibe o valor final calculado pelo servidor.
      if (result.discount > 0 && result.discountDescription) {
        toast.success(
          `${result.discountDescription}: desconto de R$ ${result.discount.toFixed(2)}`,
        );
      }

      // ------------------------------------------------
      // LIMPAR CARRINHO
      // ------------------------------------------------

      clearCart();

      setSelectedDate(undefined);

      setSelectedTime(undefined);

      setBookings([]);

      setFixedSchedules([]);

      setOpen(false);
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o agendamento.";

      toast.error(message);
    } finally {
      setCreatingBooking(false);
    }
  };

  // ===================================================
  // CARRINHO VAZIO
  // ===================================================

  if (services.length === 0) {
    return null;
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* =================================================
BOTÃO DO CARRINHO
================================================= */}

      <SheetTrigger
        className="
    fixed
    bottom-5
    right-5
    z-50
    flex
    h-14
    items-center
    justify-center
    rounded-full
    bg-primary
    px-5
    text-primary-foreground
    shadow-lg
    transition-colors
    hover:bg-primary/90
  "
      >
        <ShoppingCart className="mr-2 h-5 w-5" />

        <span className="hidden sm:inline">Agendar</span>

        <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-sm">
          {services.length}
        </span>
      </SheetTrigger>

      {/* =================================================
      CONTEÚDO DO CARRINHO
      ================================================= */}
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[95vh] w-full overflow-y-auto rounded-t-3xl sm:max-w-2xl"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Agendar em {barbershopName}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8 pt-6">
          {/* =============================================
          SERVIÇOS SELECIONADOS
          ============================================= */}

          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />

                <h3 className="font-semibold">Serviços selecionados</h3>
              </div>

              <div className="space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{service.name}</p>

                      <p className="text-sm text-muted-foreground">
                        R$ {Number(service.price).toFixed(2)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeService(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* =========================================
              RESUMO FINANCEIRO
              ========================================= */}

              <div className="mt-5 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>

                  <span>R$ {discountResult.subtotal.toFixed(2)}</span>
                </div>

                {discountResult.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{discountResult.description}</span>

                    <span>- R$ {discountResult.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Total</span>

                  <span className="text-xl font-bold">
                    R$ {discountResult.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* =============================================
          SELEÇÃO DE DATA
          ============================================= */}

          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />

                <h3 className="font-semibold">Escolha a data</h3>
              </div>

              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelectDate}
                  disabled={{
                    before: today,
                    after: maxDate,
                  }}
                  locale={ptBR}
                  className="rounded-md border"
                />
              </div>

              {selectedDate && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Data selecionada:{" "}
                  <span className="font-medium text-foreground">
                    {format(selectedDate, "dd/MM/yyyy")}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* =============================================
          HORÁRIOS
          ============================================= */}

          {selectedDate && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />

                  <h3 className="font-semibold">Escolha o horário</h3>
                </div>

                {loadingAvailability ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {TIME_LIST.map((time) => {
                      const unavailable = isTimeUnavailable(time);

                      const selected = selectedTime === time;

                      return (
                        <Button
                          key={time}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          disabled={unavailable}
                          onClick={() => setSelectedTime(time)}
                          className="h-11"
                        >
                          {selected && <Check className="mr-1 h-4 w-4" />}

                          {time}
                        </Button>
                      );
                    })}
                  </div>
                )}

                {/* =======================================
                AVISO SOBRE HORÁRIO FIXO
                ======================================= */}

                {!loadingAvailability && fixedSchedules.length > 0 && (
                  <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      Alguns horários estão indisponíveis porque já possuem
                      horários fixos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* =============================================
          RESUMO FINAL
          ============================================= */}

          {selectedDate && selectedTime && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Barbearia</p>

                    <p className="font-medium">{barbershopName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>

                      <p className="font-medium">
                        {format(selectedDate, "dd/MM/yyyy")}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Horário</p>

                      <p className="font-medium">{selectedTime}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Serviços</p>

                    <p className="font-medium">
                      {services.map((service) => service.name).join(", ")}
                    </p>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total</span>

                      <span className="text-xl font-bold">
                        R$ {discountResult.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* =============================================
          BOTÃO CONFIRMAR
          ============================================= */}

          <Button
            type="button"
            className="h-12 w-full"
            disabled={
              creatingBooking ||
              !selectedDate ||
              !selectedTime ||
              services.length === 0
            }
            onClick={handleCreateBooking}
          >
            {creatingBooking ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Agendando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Confirmar agendamento
              </>
            )}
          </Button>

          {/* =============================================
          LIMPAR CARRINHO
          ============================================= */}

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={creatingBooking}
            onClick={clearCart}
          >
            <Minus className="mr-2 h-4 w-4" />
            Limpar serviços
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
