"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Booking } from "@prisma/client";

import { formatDate } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Calendar } from "./ui/calendar";
import { Card, CardContent } from "./ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

import { Button } from "@/app/_components/ui/button";

import { ShoppingCartIcon, Trash2Icon } from "lucide-react";

import { toast } from "sonner";

import { createBooking } from "../_actions/create-booking";
import { getBookings } from "../_actions/get-bookings";
import { getFixedSchedules } from "../_actions/get-fixed-schedules";

import SignInDialog from "./sign-in-dialog";
import { Dialog, DialogContent } from "./ui/dialog";

export interface CartService {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  barbershopId: string;
}

interface ServiceCartContextType {
  services: CartService[];
  addService: (service: CartService) => void;
  removeService: (serviceId: string) => void;
  clearCart: () => void;
  isInCart: (serviceId: string) => boolean;
  total: number;
}

const ServiceCartContext = createContext<ServiceCartContextType | undefined>(
  undefined,
);

interface ServiceCartProviderProps {
  children: ReactNode;
}

export function ServiceCartProvider({ children }: ServiceCartProviderProps) {
  const [services, setServices] = useState<CartService[]>([]);

  const addService = (service: CartService) => {
    setServices((current) => {
      if (current.some((item) => item.id === service.id)) {
        return current;
      }

      return [...current, service];
    });
  };

  const removeService = (serviceId: string) => {
    setServices((current) =>
      current.filter((service) => service.id !== serviceId),
    );
  };

  const clearCart = () => {
    setServices([]);
  };

  const isInCart = (serviceId: string) => {
    return services.some((service) => service.id === serviceId);
  };

  const total = useMemo(() => {
    return services.reduce((sum, service) => {
      return sum + Number(service.price);
    }, 0);
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

export function useServiceCart() {
  const context = useContext(ServiceCartContext);

  if (!context) {
    throw new Error(
      "useServiceCart deve ser usado dentro de ServiceCartProvider.",
    );
  }

  return context;
}

interface FixedSchedule {
  time: string;
  clientName: string;
}

const TIME_LIST = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];

const getTimeList = (bookings: Booking[], fixedSchedules: FixedSchedule[]) => {
  return TIME_LIST.filter((time) => {
    const [hour, minutes] = time.split(":").map(Number);

    const hasBookingOnCurrentTime = bookings.some(
      (booking) =>
        booking.date.getHours() === hour &&
        booking.date.getMinutes() === minutes,
    );

    const hasFixedSchedule = fixedSchedules.some(
      (schedule) => schedule.time === time,
    );

    return !hasBookingOnCurrentTime && !hasFixedSchedule;
  });
};

interface ServiceCartProps {
  barbershopId: string;
  barbershopName: string;
}

export function ServiceCart({
  barbershopId,
  barbershopName,
}: ServiceCartProps) {
  const { services, removeService, clearCart, total } = useServiceCart();

  const [cartOpen, setCartOpen] = useState(false);

  const [signInDialogIsOpen, setSignInDialogIsOpen] = useState(false);

  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);

  const [selectedTime, setSelectedTime] = useState<string | undefined>(
    undefined,
  );

  const [daysBookings, setDayBookings] = useState<Booking[]>([]);

  const [fixedSchedules, setFixedSchedules] = useState<FixedSchedule[]>([]);

  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  /*
   * Sempre que o usuário escolher uma data,
   * buscamos os agendamentos daquele dia
   * e os horários fixos da barbearia.
   */
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDay) {
        return;
      }

      try {
        const bookings = await getBookings({
          date: selectedDay,
        });

        const fixed = await getFixedSchedules({
          barbershopId,
          dayOfWeek: selectedDay.getDay(),
        });

        setDayBookings(bookings);
        setFixedSchedules(fixed);
      } catch (error) {
        console.error("Erro ao buscar disponibilidade:", error);

        toast.error("Erro ao carregar horários.");
      }
    };

    fetchAvailability();
  }, [selectedDay, barbershopId]);

  const availableTimes = getTimeList(daysBookings, fixedSchedules);

  const formattedTotal = Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(total);

  const handleOpenChange = (open: boolean) => {
    setCartOpen(open);

    if (!open) {
      setSelectedDay(undefined);
      setSelectedTime(undefined);
      setDayBookings([]);
      setFixedSchedules([]);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDay(date);
    setSelectedTime(undefined);
  };

  const handleCreateBooking = async () => {
    if (services.length === 0) {
      toast.error("Adicione pelo menos um serviço.");
      return;
    }

    if (!selectedDay || !selectedTime) {
      toast.error("Selecione a data e o horário.");
      return;
    }

    setIsCreatingBooking(true);

    try {
      /*
       * Monta a data no formato:
       *
       * YYYY-MM-DD
       *
       * Exemplo:
       * 2026-09-18
       */
      const year = selectedDay.getFullYear();

      const month = String(selectedDay.getMonth() + 1).padStart(2, "0");

      const day = String(selectedDay.getDate()).padStart(2, "0");

      const selectedDate = `${year}-${month}-${day}`;

      /*
       * Aqui está a principal mudança:
       *
       * TODOS os serviços do carrinho
       * são enviados para o backend.
       */
      const serviceIds = services.map((service) => service.id);

      console.log("=================================");
      console.log("CRIANDO AGENDAMENTO PELO CARRINHO");
      console.log("SERVIÇOS:", serviceIds);
      console.log("DATA:", selectedDate);
      console.log("HORÁRIO:", selectedTime);
      console.log("=================================");

      await createBooking({
        serviceIds,
        date: selectedDate,
        time: selectedTime,
      });

      toast.success("Agendamento criado com sucesso!");

      /*
       * Limpa o carrinho depois de salvar
       * o agendamento.
       */
      clearCart();

      setCartOpen(false);

      setSelectedDay(undefined);
      setSelectedTime(undefined);
      setDayBookings([]);
      setFixedSchedules([]);
    } catch (error) {
      console.error("ERRO AO CRIAR AGENDAMENTO:", error);

      toast.error(
        error instanceof Error ? error.message : "Erro ao criar agendamento.",
      );
    } finally {
      setIsCreatingBooking(false);
    }
  };

  /*
   * Não mostra o botão se o carrinho estiver vazio.
   */
  if (services.length === 0) {
    return null;
  }

  return (
    <>
      {/* =====================================================
          BOTÃO FLUTUANTE DO CARRINHO
      ===================================================== */}

      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <Sheet open={cartOpen} onOpenChange={handleOpenChange}>
          <SheetTrigger
            render={
              <Button
                type="button"
                size="lg"
                className="w-full max-w-md rounded-full shadow-xl"
              />
            }
          >
            <ShoppingCartIcon size={20} className="mr-2" />
            Ver carrinho ({services.length})
            <span className="ml-auto">{formattedTotal}</span>
          </SheetTrigger>

          {/* =================================================
              CARRINHO
          ================================================= */}

          <SheetContent className="flex h-full flex-col px-0">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle>Seus serviços</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              {/* =============================================
                  SERVIÇOS
              ============================================= */}

              <div className="space-y-3 border-b p-5">
                {services.map((service) => {
                  const formattedPrice = Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(Number(service.price));

                  return (
                    <Card key={service.id}>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="font-semibold">{service.name}</p>

                          <p className="text-sm text-muted-foreground">
                            {formattedPrice}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeService(service.id)}
                        >
                          <Trash2Icon size={18} />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}

                <div className="flex items-center justify-between pt-2">
                  <span className="font-semibold">Total</span>

                  <span className="text-lg font-bold text-primary">
                    {formattedTotal}
                  </span>
                </div>
              </div>

              {/* =============================================
                  CALENDÁRIO
              ============================================= */}

              <div className="flex justify-center border-b px-2 py-5">
                <Calendar
                  mode="single"
                  locale={ptBR}
                  selected={selectedDay}
                  onSelect={handleDateSelect}
                  disabled={{
                    before: new Date(),
                  }}
                />
              </div>

              {/* =============================================
                  HORÁRIOS
              ============================================= */}

              {selectedDay && (
                <div className="border-b p-5">
                  <h3 className="mb-3 text-sm font-semibold">
                    Horários disponíveis
                  </h3>

                  {availableTimes.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
                      {availableTimes.map((time) => (
                        <Button
                          key={time}
                          type="button"
                          variant={
                            selectedTime === time ? "default" : "outline"
                          }
                          className="shrink-0 rounded-full"
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Não há horários disponíveis para este dia.
                    </p>
                  )}
                </div>
              )}

              {/* =============================================
                  RESUMO
              ============================================= */}

              {selectedDay && selectedTime && (
                <div className="p-5">
                  <Card>
                    <CardContent className="space-y-4 p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Serviços
                        </p>

                        <div className="mt-2 space-y-1">
                          {services.map((service) => (
                            <div
                              key={service.id}
                              className="flex justify-between gap-3"
                            >
                              <span className="text-sm">{service.name}</span>

                              <span className="text-sm font-medium">
                                {Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(Number(service.price))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t pt-3">
                        <p className="text-sm text-gray-400">Data</p>

                        <p className="text-sm font-medium capitalize">
                          {formatDate(selectedDay, "d 'de' MMMM", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Horário</p>

                        <p className="text-sm font-medium">{selectedTime}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Barbearia</p>

                        <p className="max-w-[60%] truncate text-right text-sm font-medium">
                          {barbershopName}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t pt-3">
                        <p className="font-semibold">Total</p>

                        <p className="font-bold text-primary">
                          {formattedTotal}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* =================================================
                RODAPÉ
            ================================================= */}

            <SheetFooter className="border-t bg-background px-5 py-4">
              <Button
                className="w-full"
                onClick={handleCreateBooking}
                disabled={
                  services.length === 0 ||
                  !selectedDay ||
                  !selectedTime ||
                  availableTimes.length === 0 ||
                  isCreatingBooking
                }
              >
                {isCreatingBooking ? "Agendando..." : "Confirmar agendamento"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* =====================================================
          LOGIN
      ===================================================== */}

      <Dialog open={signInDialogIsOpen} onOpenChange={setSignInDialogIsOpen}>
        <DialogContent className="w-[90%] max-w-md">
          <SignInDialog />
        </DialogContent>
      </Dialog>
    </>
  );
}
