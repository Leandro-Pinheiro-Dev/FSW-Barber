"use client";

import { useEffect, useState } from "react";

import { Booking } from "@prisma/client";
import { formatDate, set } from "date-fns";
import { ptBR } from "date-fns/locale";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { createBooking } from "../_actions/create-booking";
import { getBookings } from "../_actions/get-bookings";
import { getFixedSchedules } from "../_actions/get-fixed-schedules";

import { Button } from "@/app/_components/ui/button";

import { Calendar } from "./ui/calendar";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent } from "./ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

import SignInDialog from "./sign-in-dialog";

interface Service {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  barbershopId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceItemProps {
  service: Service;
  barbershop: {
    name: string;
  };
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
    const hour = Number(time.split(":")[0]);
    const minutes = Number(time.split(":")[1]);

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

const ServiceItem = ({ service, barbershop }: ServiceItemProps) => {
  const [signInDialogIsOpen, setSignInDialogIsOpen] = useState(false);

  const [bookingSheetIsOpen, setBookingSheetIsOpen] = useState(false);

  const { data } = useSession();

  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);

  const [selectedTime, setSelectedTime] = useState<string | undefined>(
    undefined,
  );

  const [daysBookings, setDayBookings] = useState<Booking[]>([]);

  const [fixedSchedules, setFixedSchedules] = useState<FixedSchedule[]>([]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDay) return;

      try {
        const bookings = await getBookings({
          date: selectedDay,
        });

        const dayOfWeek = selectedDay.getDay();

        const fixed = await getFixedSchedules({
          barbershopId: service.barbershopId,
          dayOfWeek,
        });

        setDayBookings(bookings);
        setFixedSchedules(fixed);
      } catch (error) {
        console.error("Erro ao buscar disponibilidade:", error);

        toast.error("Erro ao carregar horários.");
      }
    };

    fetchAvailability();
  }, [selectedDay, service.barbershopId]);

  const availableTimes = getTimeList(daysBookings, fixedSchedules);

  const handleBookingClick = () => {
    if (data?.user) {
      setBookingSheetIsOpen(true);
      return;
    }

    setSignInDialogIsOpen(true);
  };

  const handleBookingSheetOpenChange = (open: boolean) => {
    setBookingSheetIsOpen(open);

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

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleCreateBooking = async () => {
    try {
      if (!selectedDay || !selectedTime) {
        return;
      }

      if (!data?.user?.id) {
        toast.error("Faça login para realizar uma reserva.");
        return;
      }

      const hour = Number(selectedTime.split(":")[0]);
      const minute = Number(selectedTime.split(":")[1]);

      const newDate = set(selectedDay, {
        hours: hour,
        minutes: minute,
        seconds: 0,
        milliseconds: 0,
      });

      await createBooking({
        serviceId: service.id,
        date: newDate,
      });

      toast.success("Reserva criada com sucesso!");

      setBookingSheetIsOpen(false);
      setSelectedDay(undefined);
      setSelectedTime(undefined);
      setDayBookings([]);
      setFixedSchedules([]);
    } catch (error) {
      console.error(error);

      toast.error("Erro ao criar reserva!");
    }
  };

  const formattedPrice = Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(service.price));

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b border-gray-800 p-3 sm:p-4">
            <div className="flex gap-3 sm:gap-4">
              {/* IMAGEM */}
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
                <Image
                  src={service.imageUrl}
                  alt={service.name}
                  fill
                  sizes="(max-width: 640px) 96px, 112px"
                  className="object-cover"
                />
              </div>

              {/* INFORMAÇÕES */}
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="text-sm font-semibold sm:text-base">
                  {service.name}
                </h3>

                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400 sm:text-sm">
                  {service.description}
                </p>

                <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <p className="text-sm font-bold text-primary sm:text-base">
                    {formattedPrice}
                  </p>

                  <Sheet
                    open={bookingSheetIsOpen}
                    onOpenChange={handleBookingSheetOpenChange}
                  >
                    <SheetTrigger
                      render={
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={handleBookingClick}
                        />
                      }
                    >
                      Reservar
                    </SheetTrigger>

                    <SheetContent className="flex h-full flex-col px-0">
                      <SheetHeader className="border-b px-5 py-4">
                        <SheetTitle>Fazer Reserva</SheetTitle>
                      </SheetHeader>

                      <div className="flex-1 overflow-y-auto">
                        {/* CALENDÁRIO */}
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

                        {/* HORÁRIOS */}
                        {selectedDay && (
                          <div className="border-b p-5">
                            <h3 className="mb-3 text-sm font-semibold">
                              Horários disponíveis
                            </h3>

                            {availableTimes.length > 0 ? (
                              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {availableTimes.map((time) => (
                                  <Button
                                    key={time}
                                    type="button"
                                    variant={
                                      selectedTime === time
                                        ? "default"
                                        : "outline"
                                    }
                                    className="shrink-0 rounded-full"
                                    onClick={() => handleTimeSelect(time)}
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

                        {/* RESUMO DA RESERVA */}
                        {selectedTime && selectedDay && (
                          <div className="px-5 py-5">
                            <Card>
                              <CardContent className="space-y-3 p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-xs text-gray-400">
                                      Serviço
                                    </p>

                                    <h2 className="font-bold">
                                      {service.name}
                                    </h2>
                                  </div>

                                  <p className="shrink-0 text-sm font-bold text-primary">
                                    {formattedPrice}
                                  </p>
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
                                  <p className="text-sm text-gray-400">
                                    Horário
                                  </p>

                                  <p className="text-sm font-medium">
                                    {selectedTime}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-gray-400">
                                    Barbearia
                                  </p>

                                  <p className="max-w-[60%] truncate text-right text-sm font-medium">
                                    {barbershop.name}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>

                      {/* CONFIRMAR */}
                      <SheetFooter className="border-t bg-background px-5 py-4">
                        <Button
                          className="w-full"
                          onClick={handleCreateBooking}
                          disabled={
                            !selectedDay ||
                            !selectedTime ||
                            availableTimes.length === 0
                          }
                        >
                          Confirmar reserva
                        </Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LOGIN */}
      <Dialog open={signInDialogIsOpen} onOpenChange={setSignInDialogIsOpen}>
        <DialogContent className="w-[90%] max-w-md">
          <SignInDialog />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServiceItem;
