"use client";

import { Button } from "@/app/_components/ui/button";
import Image from "next/image";
import { Card, CardContent } from "./ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Calendar } from "./ui/calendar";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { formatDate, set } from "date-fns";
import { createBooking } from "../_actions/create-booking";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getBookings } from "../_actions/get-bookings";
import { getFixedSchedules } from "../_actions/get-fixed-schedules";
import { Booking } from "@prisma/client";

import { Dialog, DialogContent } from "./ui/dialog";
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
  "12:00",
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

    if (hasBookingOnCurrentTime || hasFixedSchedule) {
      return false;
    }

    return true;
  });
};

const ServiceItem = ({ service, barbershop }: ServiceItemProps) => {
  const [signInDialogIsOpen, setSignInDialogIsOpen] = useState(false);
  const { data } = useSession();
  const [selectedDay, SetSelectedDay] = useState<Date | undefined>(undefined);
  const [selectedTime, SetSelectedTime] = useState<string | undefined>(
    undefined,
  );

  const [daysbookings, setDayBookings] = useState<Booking[]>([]);
  const [fixedSchedules, setFixedSchedules] = useState<FixedSchedule[]>([]);
  const [bookingSheetIsOpen, setBookingSheetIsOpen] = useState(false);

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

        console.log("Bookings:", bookings);
        console.log("Horários fixos:", fixed);

        setDayBookings(bookings);
        setFixedSchedules(fixed);
      } catch (error) {
        console.error("Erro ao buscar disponibilidade:", error);
        toast.error("Erro ao carregar horários.");
      }
    };

    fetchAvailability();
  }, [selectedDay, service.id, service.barbershopId]);

  const handleBookingClick = () => {
    if (data?.user) {
      return setBookingSheetIsOpen(true);
    }
    return setSignInDialogIsOpen(true);
  };

  const handleBookingSheetOpenChange = (open: boolean) => {
    setBookingSheetIsOpen(open);

    if (!open) {
      SetSelectedDay(undefined);
      SetSelectedTime(undefined);
      setDayBookings([]);
      setFixedSchedules([]);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    SetSelectedDay(date);
  };
  const handleTimeSelect = (time: string | undefined) => {
    SetSelectedTime(time);
  };
  const handleCreateBooking = async () => {
    try {
      if (!selectedDay || !selectedTime) return;

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
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar reserva!");
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <div className="border-b border-gray-800 py-6">
            <div className="flex items-center gap-3 p-3">
              {/* IMAGE */}
              <div className="h-28 w-28 overflow-hidden rounded-lg">
                <Image
                  src={service.imageUrl}
                  alt={service.name}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* DIREITA */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{service.name}</h3>
                <p className="text-sm text-gray-400">{service.description}</p>

                {/* PREÇO E BOTÃO */}
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-primary">
                    {Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number(service.price))}
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
                          onClick={handleBookingClick}
                        />
                      }
                    >
                      Reservar
                    </SheetTrigger>
                    <SheetContent className="flex h-full flex-col px-0">
                      <SheetHeader>
                        <SheetTitle>Fazer Reserva</SheetTitle>
                      </SheetHeader>

                      <div className="flex-1 overflow-y-auto">
                        <div className="flex justify-center border-b border-solid py-5">
                          <Calendar
                            mode="single"
                            locale={ptBR}
                            selected={selectedDay}
                            onSelect={handleDateSelect}
                            disabled={{ before: new Date() }}
                          />
                        </div>

                        {selectedDay && (
                          <div className="flex gap-3 overflow-x-auto border-b border-solid p-5 [&::-webkit-scrollbar]:hidden">
                            {getTimeList(daysbookings, fixedSchedules).map(
                              (time) => (
                                <Button
                                  key={time}
                                  variant={
                                    selectedTime === time
                                      ? "default"
                                      : "outline"
                                  }
                                  className="rounded-full"
                                  onClick={() => handleTimeSelect(time)}
                                >
                                  {time}
                                </Button>
                              ),
                            )}
                          </div>
                        )}

                        {selectedTime && selectedDay && (
                          <div className="my-5 px-5">
                            <Card>
                              <CardContent className="space-y-3 p-3">
                                <div className="flex items-center justify-between">
                                  <h2 className="font-bold">{service.name}</h2>

                                  <p className="text-sm font-bold">
                                    {Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(Number(service.price))}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between">
                                  <h2 className="text-sm text-gray-400">
                                    Data
                                  </h2>

                                  <p className="text-sm">
                                    {formatDate(selectedDay, "d 'de' MMMM", {
                                      locale: ptBR,
                                    })}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between">
                                  <h2 className="text-sm text-gray-400">
                                    Horário
                                  </h2>

                                  <p className="text-sm">{selectedTime}</p>
                                </div>

                                <div className="flex items-center justify-between">
                                  <h2 className="text-sm text-gray-400">
                                    Barbearia
                                  </h2>

                                  <p className="text-sm">{barbershop.name}</p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>

                      <SheetFooter className="border-t px-5 py-4">
                        <Button
                          className="w-full"
                          onClick={handleCreateBooking}
                          disabled={!selectedDay || !selectedTime}
                        >
                          Confirmar
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

      <Dialog
        open={signInDialogIsOpen}
        onOpenChange={(open) => setSignInDialogIsOpen(open)}
      >
        <DialogContent className="w-[90%]">
          <SignInDialog />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServiceItem;
