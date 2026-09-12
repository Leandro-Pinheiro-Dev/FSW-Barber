import { Prisma } from "@prisma/client";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Avatar, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

interface BookingItemProps {
  booking: Prisma.BookingGetPayload<{
    include: {
      service: {
        include: {
          barbershop: true;
        };
      };
    };
  }>;
}

const BookingItem = ({ booking }: BookingItemProps) => {
  const isConfirmed = isFuture(booking.date);

  return (
    <Card className="w-full min-w-[85%] shrink-0 overflow-hidden sm:min-w-[360px] md:min-w-0">
      <CardContent className="flex min-h-[150px] p-0">
        {/* INFORMAÇÕES */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:p-5">
          <Badge
            className="w-fit"
            variant={isConfirmed ? "default" : "secondary"}
          >
            {isConfirmed ? "Confirmado" : "Finalizado"}
          </Badge>

          <h3 className="truncate text-sm font-semibold sm:text-base">
            {booking.service.name}
          </h3>

          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage
                src="https://utfs.io/f/c97a2dc9-cf62-468b-a851-bfd2bdde775f-16p.png"
                alt={booking.service.barbershop.name}
              />
            </Avatar>

            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {booking.service.barbershop.name}
            </p>
          </div>

          <p className="mt-auto text-xs text-muted-foreground">
            {format(booking.date, "EEEE, d 'de' MMMM", {
              locale: ptBR,
            })}
          </p>
        </div>

        {/* DATA E HORÁRIO */}
        <div className="flex w-[82px] shrink-0 flex-col items-center justify-center border-l bg-muted/20 px-3 sm:w-[95px]">
          <p className="text-xs capitalize text-muted-foreground">
            {format(booking.date, "MMM", {
              locale: ptBR,
            })}
          </p>

          <p className="text-2xl font-bold leading-none sm:text-3xl">
            {format(booking.date, "dd")}
          </p>

          <p className="mt-1 text-sm font-medium">
            {format(booking.date, "HH:mm")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingItem;
