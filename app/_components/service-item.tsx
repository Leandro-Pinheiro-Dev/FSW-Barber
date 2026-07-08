import { Button } from "@/app/_components/ui/button";
import { BarbershopService } from "@prisma/client";
import Image from "next/image";
import { Card, CardContent } from "./ui/card";

interface ServiceItemProps {
  service: BarbershopService;
}

const ServiceItem = ({ service }: ServiceItemProps) => {
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

                <Button variant="secondary" size="sm">
                  Reservar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceItem;
