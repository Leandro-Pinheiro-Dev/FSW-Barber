import Image from "next/image";
import { Barbershop } from "@prisma/client";
import { Card, CardContent } from "./ui/card";
import { Button } from "@base-ui/react";
import { StarIcon } from "lucide-react";
import { Badge } from "./ui/badge";

interface BarbershopItemProps {
  barbershop: Barbershop;
}

const BarbershopItem = ({ barbershop }: BarbershopItemProps) => {
  return (
    <Card className="min-w-41.75 rounded-2xl">
      <CardContent className="p-0 px-1 pb-3 pt-1">
        {/* IMAGEM */}
        <div className="relative h-39.75 w-full">
          <Image
            src={barbershop.imageUrl}
            alt={barbershop.name}
            fill
            className="rounded-2xl object-cover"
          />
          <Badge className="absolute left-2 top-2 bg-gray-500 space-x-2">
            <StarIcon
              size={12}
              className="fill-primary text-primary bg-gray-500 "
            />
            <p className=" text-xs font-semibold text-white"> 5,0 </p>
          </Badge>
        </div>
        {/* TEXTO */}
        <div className="px-1 py-3">
          <h3 className="truncate font-semibold">{barbershop.name}</h3>
          <p className="truncate text-sm text-gray-400">{barbershop.address}</p>
          <Button className="mt-3 w-full bg-gray-800 text-white py-2 rounded-md">
            Reservar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarbershopItem;
