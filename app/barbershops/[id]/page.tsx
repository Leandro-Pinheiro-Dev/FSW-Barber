import { db } from "@/lib/prisma";
import Link from "next/link";

import { Button } from "@/app/_components/ui/button";
import { ChevronLeftIcon, MapPinIcon, MenuIcon, StarIcon } from "lucide-react";
import Image from "next/image";
import ServiceItem from "@/app/_components/service-item";
import PhoneItem from "@/app/_components/phone-item";

interface BarbershopPageProps {
  params: Promise<{
    id: string;
  }>;
}

//CHAMAR BANCO DE DADOS

const BarbershopPage = async ({ params }: BarbershopPageProps) => {
  const { id } = await params;

  const barbershop = await db.barbershop.findUnique({
    where: {
      id,
    },
    include: {
      services: true,
    },
  });

  if (!barbershop) {
    return (
      <div className="flex h-screen items-center justify-center">
        Barbearia não encontrada.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/*IMAGEM*/}
      <div className="relative h-120 w-full overflow-hidden rounded-2xl">
        <Image
          src="/detalhes.jpeg"
          alt={barbershop.name}
          fill
          className="object-cover"
          unoptimized
        />

        <div className="absolute left-4 top-4">
          <Link href="/">
            <Button size="icon" variant="secondary">
              <ChevronLeftIcon />
            </Button>
          </Link>
        </div>

        <div className="absolute right-4 top-4">
          <Button size="icon" variant="secondary">
            <MenuIcon />
          </Button>
        </div>
      </div>

      {/*TITULO*/}
      <div className="border-b border-solid p-5 pt-8">
        <h1 className="mb-3 mt-2 text-xl font-bold">{barbershop.name}</h1>
        <div className="mb-2 flex items-center gap-2">
          <MapPinIcon className="text-primary" size={18} />
          <p className="text-sm">{barbershop?.address}</p>
        </div>

        <div className="flex items-center gap-2">
          <StarIcon className="fill-primary text-primary" size={18} />
          <p className="text-sm">5,0 (80 Avaliações)</p>
        </div>
      </div>

      {/*DESCRIÇÃO*/}
      <div className="p-5 border-b border-solid space-y-3">
        <h2 className="font bold uppercase text-gray-400 text-xs">Sobre Nós</h2>
        <p className="w-[500px]text-sm text-justify">
          {barbershop?.description}
        </p>
      </div>
      {/*SERVIÇOS*/}
      <div className="space-y-3 border-b border-solid p-5">
        <h2 className="font bold uppercase text-gray-400 text-xs mb-3">
          Serviços
        </h2>
        <div className="space-y-3">
          {barbershop.services.map((service) => (
            <ServiceItem key={service.id} service={service} />
          ))}
        </div>
      </div>

      {/*CONTATO*/}
      <div className="space-y-3 p-5">
        {barbershop.phones.map((phone) => (
          <PhoneItem key={phone} phone={phone} />
        ))}
      </div>
    </div>
  );
};

export default BarbershopPage;
