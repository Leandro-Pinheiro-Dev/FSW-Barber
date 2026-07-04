import { Avatar, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

//TODO:receber agendamento como prop
const BookingItem = () => {
  return (
    <>
      <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
        Agendamentos
      </h2>

      <Card>
        <CardContent className="flex justify-between p-0">
          {/* ESQUERDA */}
          <div className="flex flex-col gap-2 py-5 pl-5">
            <Badge className="w-fit">Confirmado</Badge>

            <h3 className="font-semibold">Corte de cabelo</h3>

            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src="https://utfs.io/f/c97a2dc9-cf62-468b-a851-bfd2bdde775f-16p.png" />
              </Avatar>

              <p className="text-sm">Barbearia SpaçoVip</p>
            </div>
          </div>

          {/* DIREITA */}
          <div className="flex flex-col items-center justify-center border-l px-5">
            <p className="text-sm">Ago</p>
            <p className="text-2xl font-bold">03</p>
            <p className="text-sm">20h00</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default BookingItem;
