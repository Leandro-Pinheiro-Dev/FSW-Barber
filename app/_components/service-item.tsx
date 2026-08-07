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
import { addDays, formatDate, set } from "date-fns";
import { createBooking } from "../_actions/create-booking";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getBookings } from "../_actions/get-bookings";
import { Booking } from "@prisma/client";

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

const getTimeList = (bookings: Booking[]) => {
  return TIME_LIST.filter((time) => {
    const hour = Number(time.split(":")[0]);
    const minutes = Number(time.split(":")[1]);

    const hasBookingOnCurrentTime = bookings.some(
      (booking) =>
        booking.date.getHours() === hour &&
        booking.date.getMinutes() === minutes,
    );
    if (hasBookingOnCurrentTime) {
      return false;
    }
    return true;
  });
};

const ServiceItem = ({ service, barbershop }: ServiceItemProps) => {
  const { data } = useSession();
  const [selectedDay, SetSelectedDay] = useState<Date | undefined>(undefined);
  const [selectedTime, SetSelectedTime] = useState<string | undefined>(
    undefined,
  );

  const [daysbookings, setDayBookings] = useState<Booking[]>([]);
  const [bookingSheetIsOpen, setBookingSheetIsOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!selectedDay) return;

      const bookings = await getBookings({
        date: selectedDay,
        serviceId: service.id,
      });

      console.log(bookings); // <-- veja o resultado

      setDayBookings(bookings);
    };

    fetch();
  }, [selectedDay, service.id]);

  const handleBookingSheetOpenChange = (open: boolean) => {
    setBookingSheetIsOpen(open);

    if (!open) {
      SetSelectedDay(undefined);
      SetSelectedTime(undefined);
      setDayBookings([]);
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
        userId: data.user.id,
        date: newDate,
      });

      toast.success("Reserva criada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar reserva!");
    }
  };

  return (
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
                        onClick={() => setBookingSheetIsOpen(true)}
                      />
                    }
                  >
                    Reservar
                  </SheetTrigger>
                  <SheetContent className="px-0">
                    <SheetHeader>
                      <SheetTitle>Fazer Reserva</SheetTitle>
                    </SheetHeader>
                    <div className="border-b border-solid py-5 flex justify-center">
                      <Calendar
                        mode="single"
                        locale={ptBR}
                        selected={selectedDay}
                        onSelect={handleDateSelect}
                        disabled={{ before: addDays(new Date(), 1) }}
                      />
                    </div>
                    {selectedDay && (
                      <div className="flex gap-3 border-b border-solid overflow-x-auto p-5  [&::-webkit-scrollbar]:hidden">
                        {getTimeList(daysbookings).map((time) => (
                          <Button
                            key={time}
                            variant={
                              selectedTime === time ? "default" : "outline"
                            }
                            className="rounded-full"
                            onClick={() => handleTimeSelect(time)}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    )}

                    {selectedTime && selectedDay && (
                      <div className="my-5">
                        <Card>
                          <CardContent className="space-y-3 p-3">
                            <div className="flex justify-between items-center">
                              <h2 className="font-bold">{service.name}</h2>
                              <p className="text-sm font-bold">
                                {Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(Number(service.price))}
                              </p>
                            </div>

                            <div className="flex justify-between items-center">
                              <h2 className="text-sm text-gray-400">Data</h2>
                              <p className="text-sm">
                                {formatDate(selectedDay, "d 'de' MMMM", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>

                            <div className="flex justify-between items-center">
                              <h2 className="text-sm text-gray-400">Horario</h2>
                              <p className="text-sm">{selectedTime}</p>
                            </div>

                            <div className="flex justify-between items-center">
                              <h2 className="text-sm text-gray-400">
                                Barbearia
                              </h2>
                              <p className="text-sm">{barbershop.name}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    <SheetFooter className="mt-5 px-5">
                      <Button
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
  );
};

export default ServiceItem;
