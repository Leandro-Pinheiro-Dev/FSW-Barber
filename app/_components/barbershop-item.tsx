import { Barbershop } from "@prisma/client";
import { Card, CardContent } from "./ui/card";
import Image from "next/image";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { StarIcon } from "lucide-react";
import Link from "next/link";

interface BarbershopItemProps {
  barbershop: Barbershop;
}

const BarbershopItem = ({ barbershop }: BarbershopItemProps) => {
  return (
    <Card className="min-w- 40 rounded-2xl">
      <CardContent className="p-0 px-1 pt-1">
        {/* IMAGEM */}
        <div className="relative h-44 w-full overflow-hidden rounded-xl">
          <Image
            src="/rafa-2026.jpeg"
            alt={barbershop.name}
            fill
            sizes="200px"
            className="object-cover"
          />

          <Badge
            variant="secondary"
            className="absolute left-2 top-2 flex items-center gap-1"
          >
            <StarIcon size={12} className="fill-primary text-primary" />
            <span className="text-xs font-semibold">5,0</span>
          </Badge>
        </div>

        {/* TEXTO */}
        <div className="px-1 py-3 pb-3">
          <h3 className="truncate font-semibold">{barbershop.name}</h3>

          <Button variant="secondary" className="mt-3 w-full">
            <Link href={`/barbershops/${barbershop.id}`}>Reservar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarbershopItem;
