import { Prisma } from "@prisma/client";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    <Card className="min-w-[85%] shrink-0 ">
      <CardContent className="flex justify-between p-0">
        <div className="flex flex-col gap-2 py-5 pl-5">
          <Badge
            className="w-fit"
            variant={isConfirmed ? "default" : "secondary"}
          >
            {isConfirmed ? "Confirmado" : "Finalizado"}
          </Badge>

          <h3 className="font-semibold">{booking.service.name}</h3>

          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src="https://utfs.io/f/c97a2dc9-cf62-468b-a851-bfd2bdde775f-16p.png" />
            </Avatar>

            <p className="text-sm">{booking.service.barbershop.name}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border-l px-5">
          <p className="text-sm">
            {format(booking.date, "MMMM", { locale: ptBR })}
          </p>

          <p className="text-2xl font-bold">{format(booking.date, "dd")}</p>

          <p className="text-sm">{format(booking.date, "HH:mm")}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingItem;
