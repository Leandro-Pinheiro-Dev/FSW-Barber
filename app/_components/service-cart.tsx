"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

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

import {
  getBusinessSchedule,
  type BusinessScheduleDay,
} from "@/app/barbeiro/dashboard/_actions/business-schedule";

import { calculateBookingDiscount } from "@/app/utils/booking-discount";

import {
  getPricedBookingServices,
  isHaircutService,
} from "@/app/utils/booking-pricing";

// =====================================================
// TIPOS
// =====================================================

interface Service {
  id: string;
  name: string;
  price: number;
}

// =====================================================
// CONTEXTO
// =====================================================

interface ServiceCartContextData {
  services: Service[];

  addService: (service: Service) => void;

  removeService: (serviceId: string) => void;

  clearCart: () => void;

  isInCart: (serviceId: string) => boolean;

  total: number;
}

const ServiceCartContext = createContext<ServiceCartContextData | null>(null);

// =====================================================
// PROVIDER
// =====================================================

interface ServiceCartProviderProps {
  children: ReactNode;

  initialService?: Service | null;
}

export function ServiceCartProvider({ children }: ServiceCartProviderProps) {
  // ---------------------------------------------------
  // O CARRINHO COMEÇA VAZIO
  //
  // O serviço da busca rápida NÃO é adicionado
  // automaticamente.
  // ---------------------------------------------------

  const [services, setServices] = useState<Service[]>([]);

  // ---------------------------------------------------
  // ADICIONAR SERVIÇO
  // ---------------------------------------------------

  const addService = useCallback((service: Service) => {
    setServices((currentServices) => {
      const alreadyExists = currentServices.some(
        (item) => item.id === service.id,
      );

      if (alreadyExists) {
        return currentServices;
      }

      return [...currentServices, service];
    });
  }, []);

  // ---------------------------------------------------
  // REMOVER SERVIÇO
  // ---------------------------------------------------

  const removeService = useCallback((serviceId: string) => {
    setServices((currentServices) =>
      currentServices.filter((service) => service.id !== serviceId),
    );
  }, []);

  // ---------------------------------------------------
  // LIMPAR CARRINHO
  // ---------------------------------------------------

  const clearCart = useCallback(() => {
    setServices([]);
  }, []);

  // ---------------------------------------------------
  // VERIFICAR SE ESTÁ NO CARRINHO
  // ---------------------------------------------------

  const isInCart = useCallback(
    (serviceId: string) => {
      return services.some((service) => service.id === serviceId);
    },
    [services],
  );

  // ---------------------------------------------------
  // TOTAL NORMAL DO CARRINHO
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
// =====================================================

interface FixedScheduleData {
  clientName: string;
  time: string;
}

// =====================================================
// PROPS
// =====================================================

interface ServiceCartProps {
  barbershopId: string;

  barbershopName: string;

  // Serviço vindo da busca rápida.
  //
  // Ele NÃO é colocado automaticamente no carrinho.
  // Serve apenas para manter compatibilidade com
  // a chamada existente do componente.

  initialService?: Service | null;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function ServiceCart({
  barbershopId,
  barbershopName,
}: ServiceCartProps) {
  const { services, removeService, clearCart } = useServiceCart();

  // ===================================================
  // ESTADOS
  // ===================================================

  const [open, setOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>();

  const [selectedTime, setSelectedTime] = useState<string>();

  const [bookings, setBookings] = useState<BookingData[]>([]);

  const [fixedSchedules, setFixedSchedules] = useState<FixedScheduleData[]>([]);

  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [creatingBooking, setCreatingBooking] = useState(false);

  // ===================================================
  // CORTE INFANTIL
  // ===================================================

  // Estado do checkbox.
  //
  // IMPORTANTE:
  // Este estado sozinho NÃO determina o preço.
  // O preço efetivo usa activeChildPricing abaixo.
  const [isChild, setIsChild] = useState(false);

  // ===================================================
  // CONFIGURAÇÃO DA AGENDA
  // ===================================================

  const [businessSchedule, setBusinessSchedule] = useState<
    BusinessScheduleDay[]
  >([]);

  const [loadingBusinessSchedule, setLoadingBusinessSchedule] = useState(false);

  const [businessScheduleLoaded, setBusinessScheduleLoaded] = useState(false);

  // ===================================================
  // VERIFICAR SE EXISTE CORTE DE CABELO
  // ===================================================

  const hasHaircut = useMemo(() => {
    return services.some((service) => isHaircutService(service.name));
  }, [services]);

  // ===================================================
  // REGRA EFETIVA DO CORTE INFANTIL
  // ===================================================
  //
  // O corte infantil só pode ser aplicado se:
  //
  // 1. O checkbox estiver marcado
  // 2. O carrinho possuir Corte de Cabelo
  //
  // Não usamos useEffect para alterar estado.
  // ===================================================

  const activeChildPricing = isChild && hasHaircut;

  // ===================================================
  // SERVIÇOS COM PREÇO CALCULADO
  // ===================================================
  //
  // Exemplo:
  //
  // Corte normal:
  // R$35
  //
  // Corte infantil:
  // R$30
  //
  // Barba:
  // continua R$35
  // ===================================================

  const pricedServices = useMemo(() => {
    return getPricedBookingServices(services, activeChildPricing);
  }, [services, activeChildPricing]);

  // ===================================================
  // DATA MÍNIMA
  // ===================================================

  const today = useMemo(() => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }, []);

  // ===================================================
  // DATA MÁXIMA
  // ===================================================

  const maxDate = useMemo(() => {
    const date = new Date(today);

    date.setDate(date.getDate() + 60);

    return date;
  }, [today]);

  // ===================================================
  // DESCONTO
  // ===================================================
  //
  // O desconto é calculado DEPOIS do preço infantil.
  //
  // Exemplo:
  //
  // Corte infantil = R$30
  // Barba = R$35
  // Subtotal = R$65
  // Combo = -R$10
  // Total = R$55
  // ===================================================

  const discountResult = useMemo(() => {
    return calculateBookingDiscount(
      pricedServices.map((service) => ({
        name: service.name,
        price: service.price,
      })),
    );
  }, [pricedServices]);

  // ===================================================
  // FORMATAR DATA PARA O SERVIDOR
  //
  // IMPORTANTE:
  // Não usamos toISOString() porque isso pode mudar
  // o dia por causa do fuso horário.
  // ===================================================

  const formatDateForServer = useCallback((date: Date) => {
    return format(date, "yyyy-MM-dd");
  }, []);

  // ===================================================
  // BUSCAR CONFIGURAÇÃO DA AGENDA
  // ===================================================

  const loadBusinessSchedule = async () => {
    try {
      setLoadingBusinessSchedule(true);

      const result = await getBusinessSchedule();

      setBusinessSchedule(result ?? []);

      setBusinessScheduleLoaded(true);
    } catch (error) {
      console.error("Erro ao carregar configuração da agenda:", error);

      setBusinessScheduleLoaded(false);

      toast.error("Não foi possível carregar a configuração da agenda.");
    } finally {
      setLoadingBusinessSchedule(false);
    }
  };

  // ===================================================
  // ABRIR / FECHAR CARRINHO
  // ===================================================

  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      await loadBusinessSchedule();
    }
  };

  // ===================================================
  // BUSCAR CONFIGURAÇÃO DO DIA
  // ===================================================

  const getBusinessDay = useCallback(
    (dayOfWeek: number) => {
      return businessSchedule.find((day) => day.dayOfWeek === dayOfWeek);
    },
    [businessSchedule],
  );

  // ===================================================
  // VERIFICAR SE O DIA ESTÁ ABERTO
  // ===================================================

  const isBusinessDayActive = (date: Date) => {
    if (!businessScheduleLoaded) {
      return true;
    }

    const dayOfWeek = date.getDay();

    const businessDay = getBusinessDay(dayOfWeek);

    if (!businessDay) {
      return false;
    }

    return businessDay.active;
  };

  // ===================================================
  // HORÁRIOS ATIVOS DO DIA
  // ===================================================

  const availableTimes = useMemo(() => {
    if (!selectedDate || !businessScheduleLoaded) {
      return [];
    }

    const dayOfWeek = selectedDate.getDay();

    const businessDay = getBusinessDay(dayOfWeek);

    if (!businessDay || !businessDay.active) {
      return [];
    }

    return businessDay.timeSlots
      .filter((slot) => slot.active)
      .map((slot) => slot.time)
      .sort();
  }, [selectedDate, businessScheduleLoaded, getBusinessDay]);

  // ===================================================
  // SELECIONAR DATA
  // ===================================================

  const handleSelectDate = async (date: Date | undefined) => {
    setSelectedDate(date);

    setSelectedTime(undefined);

    setBookings([]);

    setFixedSchedules([]);

    if (!date) {
      return;
    }

    // -------------------------------------------------
    // VERIFICAR DIA DA SEMANA
    // -------------------------------------------------

    const dayOfWeek = date.getDay();

    const businessDay = getBusinessDay(dayOfWeek);

    if (!businessDay) {
      toast.error("Este dia não está configurado para atendimento.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // VERIFICAR SE A BARBEARIA ESTÁ ABERTA
    // -------------------------------------------------

    if (!businessDay.active) {
      toast.error("A barbearia está fechada neste dia.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // VERIFICAR HORÁRIOS ATIVOS
    // -------------------------------------------------

    const activeTimes = businessDay.timeSlots.filter((slot) => slot.active);

    if (activeTimes.length === 0) {
      toast.error("Não existem horários disponíveis neste dia.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // BUSCAR DISPONIBILIDADE
    // -------------------------------------------------

    try {
      setLoadingAvailability(true);

      // Não usamos selectedDate aqui porque
      // setSelectedDate() é assíncrono.

      const dateString = formatDateForServer(date);

      const [bookingsResult, fixedSchedulesResult] = await Promise.all([
        getBookings({
          date,
        }),

        getFixedSchedules({
          barbershopId,
          date: dateString,
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
      return true;
    }

    // -------------------------------------------------
    // 1. VERIFICAR CONFIGURAÇÃO DA AGENDA
    // -------------------------------------------------

    const dayOfWeek = selectedDate.getDay();

    const businessDay = getBusinessDay(dayOfWeek);

    if (!businessDay || !businessDay.active) {
      return true;
    }

    const businessTimeSlot = businessDay.timeSlots.find(
      (slot) => slot.time === time,
    );

    if (!businessTimeSlot || !businessTimeSlot.active) {
      return true;
    }

    // -------------------------------------------------
    // 2. HORÁRIO FIXO
    // -------------------------------------------------

    const fixedScheduleExists = fixedSchedules.some(
      (schedule) => schedule.time === time,
    );

    if (fixedScheduleExists) {
      return true;
    }

    // -------------------------------------------------
    // 3. AGENDAMENTO NORMAL
    // -------------------------------------------------

    const selectedDateString = format(selectedDate, "yyyy-MM-dd");

    const bookingExists = bookings.some((booking) => {
      const bookingDate = new Date(booking.date);

      const bookingDateString = format(bookingDate, "yyyy-MM-dd");

      const bookingTime = format(bookingDate, "HH:mm");

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

    // -------------------------------------------------
    // VERIFICAR DIA
    // -------------------------------------------------

    if (!isBusinessDayActive(selectedDate)) {
      toast.error("A barbearia está fechada neste dia.");

      return;
    }

    // -------------------------------------------------
    // VERIFICAR HORÁRIO NOVAMENTE
    // -------------------------------------------------

    if (isTimeUnavailable(selectedTime)) {
      toast.error("Este horário não está mais disponível.");

      return;
    }

    try {
      setCreatingBooking(true);

      // ------------------------------------------------
      // DATA NO FORMATO DO SERVIDOR
      // ------------------------------------------------

      const date = formatDateForServer(selectedDate);

      // ------------------------------------------------
      // CRIAR AGENDAMENTO
      // ------------------------------------------------
      //
      // Enviamos activeChildPricing,
      // e não isChild diretamente.
      //
      // Dessa forma, se o usuário tiver marcado
      // infantil mas remover o Corte de Cabelo,
      // o servidor receberá false.
      // ------------------------------------------------

      const result = await createBooking({
        serviceIds: services.map((service) => service.id),

        date,

        time: selectedTime,

        isChild: activeChildPricing,
      });

      // ------------------------------------------------
      // SUCESSO
      // ------------------------------------------------

      toast.success("Agendamento realizado com sucesso!");

      if (result.discount > 0 && result.discountDescription) {
        toast.success(
          `${result.discountDescription}: desconto de R$ ${result.discount.toFixed(
            2,
          )}`,
        );
      }

      // ------------------------------------------------
      // LIMPAR
      // ------------------------------------------------

      clearCart();

      setIsChild(false);

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
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
          CONTEÚDO
      ================================================= */}

      <SheetContent
        side="bottom"
        className="
          mx-auto
          max-h-[95vh]
          w-full
          overflow-y-auto
          rounded-t-3xl
          sm:max-w-2xl
        "
      >
        <SheetHeader className="text-left">
          <SheetTitle>Agendar em {barbershopName}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8 pt-6">
          {/* =================================================
              SERVIÇOS
          ================================================= */}

          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />

                <h3 className="font-semibold">Serviços selecionados</h3>
              </div>

              <div className="space-y-3">
                {pricedServices.map((service) => (
                  <div
                    key={service.id}
                    className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        rounded-lg
                        border
                        p-3
                      "
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

              {/* =================================================
                  CORTE INFANTIL
              ================================================= */}

              {hasHaircut && (
                <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                  <label
                    htmlFor="child-cut"
                    className="
                      flex
                      cursor-pointer
                      items-center
                      gap-3
                    "
                  >
                    <input
                      id="child-cut"
                      type="checkbox"
                      checked={isChild}
                      onChange={(event) => setIsChild(event.target.checked)}
                      disabled={creatingBooking}
                      className="
                        h-4
                        w-4
                        cursor-pointer
                        rounded
                        border-gray-300
                      "
                    />

                    <div>
                      <p className="font-medium">
                        Corte infantil (até 10 anos)
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Corte de Cabelo por R$30,00
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* =================================================
                  RESUMO
              ================================================= */}

              <div className="mt-5 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>

                  <span>R$ {discountResult.subtotal.toFixed(2)}</span>
                </div>

                {activeChildPricing && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Corte infantil (até 10 anos)
                    </span>

                    <span>R$ 30,00</span>
                  </div>
                )}

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

          {/* =================================================
              DATA
          ================================================= */}

          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />

                <h3 className="font-semibold">Escolha a data</h3>
              </div>

              <div className="flex justify-center">
                {loadingBusinessSchedule ? (
                  <div className="flex h-[330px] items-center justify-center">
                    <div
                      className="
                        h-6
                        w-6
                        animate-spin
                        rounded-full
                        border-2
                        border-current
                        border-t-transparent
                      "
                    />
                  </div>
                ) : (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelectDate}
                    disabled={(date) => {
                      if (date < today) {
                        return true;
                      }

                      if (date > maxDate) {
                        return true;
                      }

                      if (!businessScheduleLoaded) {
                        return true;
                      }

                      return !isBusinessDayActive(date);
                    }}
                    locale={ptBR}
                    className="rounded-md border"
                  />
                )}
              </div>

              {businessScheduleLoaded && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Os dias disponíveis seguem o horário configurado pela
                  barbearia.
                </p>
              )}

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

          {/* =================================================
              HORÁRIOS
          ================================================= */}

          {selectedDate && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />

                  <h3 className="font-semibold">Escolha o horário</h3>
                </div>

                {loadingAvailability ? (
                  <div className="flex items-center justify-center py-8">
                    <div
                      className="
                        h-6
                        w-6
                        animate-spin
                        rounded-full
                        border-2
                        border-current
                        border-t-transparent
                      "
                    />
                  </div>
                ) : availableTimes.length === 0 ? (
                  <div className="rounded-lg border bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Não existem horários disponíveis para este dia.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availableTimes.map((time) => {
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

                {/* =================================================
                    AVISO SOBRE HORÁRIOS FIXOS
                ================================================= */}

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

          {/* =================================================
              RESUMO FINAL
          ================================================= */}

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
                      {pricedServices.map((service) => service.name).join(", ")}
                    </p>
                  </div>

                  {activeChildPricing && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Tipo de corte
                      </p>

                      <p className="font-medium">Infantil — R$30,00</p>
                    </div>
                  )}

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

          {/* =================================================
              CONFIRMAR
          ================================================= */}

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
                <div
                  className="
                    mr-2
                    h-4
                    w-4
                    animate-spin
                    rounded-full
                    border-2
                    border-current
                    border-t-transparent
                  "
                />
                Agendando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Confirmar agendamento
              </>
            )}
          </Button>

          {/* =================================================
              LIMPAR
          ================================================= */}

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={creatingBooking}
            onClick={() => {
              clearCart();

              setIsChild(false);

              setSelectedDate(undefined);

              setSelectedTime(undefined);

              setBookings([]);

              setFixedSchedules([]);
            }}
          >
            <Minus className="mr-2 h-4 w-4" />
            Limpar serviços
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
