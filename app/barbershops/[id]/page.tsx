import { db } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/app/_components/ui/button";
import { ChevronLeftIcon, MapPinIcon, MenuIcon, StarIcon } from "lucide-react";

import ServiceItem from "@/app/_components/service-item";
import PhoneItem from "@/app/_components/phone-item";
import { Sheet, SheetTrigger } from "@/app/_components/ui/sheet";
import SideBarSheet from "@/app/_components/sidebar-sheet";
import ScrollToResult from "@/app/_components/scroll-to-result";

interface BarbershopPageProps {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    search?: string;
  }>;
}

const BarbershopPage = async ({
  params,
  searchParams,
}: BarbershopPageProps) => {
  // Recebe o id da URL
  const { id } = await params;

  // Recebe o texto pesquisado (caso exista)
  const { search = "" } = await searchParams;

  // Busca a barbearia e seus relacionamentos
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

  const services = barbershop.services.map((service) => ({
    ...service,
    price: Number(service.price),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* ====================== */}
      {/* Banner da Barbearia */}
      {/* ====================== */}
      <div className="relative h-120 w-full overflow-hidden rounded-2xl">
        <Image
          src="/detalhes.jpeg"
          alt={barbershop.name}
          fill
          priority
          className="object-cover"
        />

        {/* Botões superiores */}
        <div className="absolute inset-x-4 top-4 z-10 flex justify-between">
          <Sheet>
            <SheetTrigger render={<Button size="icon" variant="secondary" />}>
              <MenuIcon size={20} />
            </SheetTrigger>

            <SideBarSheet />
          </Sheet>

          <Link href="/">
            <Button size="icon" variant="secondary">
              <ChevronLeftIcon size={20} />
            </Button>
          </Link>
        </div>
      </div>

      {/* ====================== */}
      {/* Informações */}
      {/* ====================== */}
      <div className="border-b p-5 pt-8">
        <h1 className="mb-3 text-xl font-bold">{barbershop.name}</h1>

        <div className="mb-2 flex items-center gap-2">
          <MapPinIcon size={18} className="text-primary" />

          <p className="text-sm">{barbershop.address}</p>
        </div>

        <div className="flex items-center gap-2">
          <StarIcon size={18} className="fill-primary text-primary" />

          <p className="text-sm">5,0 (80 avaliações)</p>
        </div>
      </div>

      {/* ====================== */}
      {/* Sobre */}
      {/* ====================== */}
      <div className="space-y-3 border-b p-5">
        <h2 className="text-xs font-bold uppercase text-gray-400">Sobre nós</h2>

        <p className="text-justify text-sm">{barbershop.description}</p>
      </div>

      {/* ====================== */}
      {/* Serviços */}
      {/* ====================== */}
      <div className="space-y-3 border-b p-5">
        <h2 className="mb-3 text-xs font-bold uppercase text-gray-400">
          Serviços
        </h2>

        <div className="space-y-3">
          {services.map((service) => {
            const match =
              search &&
              (service.name.toLowerCase().includes(search.toLowerCase()) ||
                service.description
                  .toLowerCase()
                  .includes(search.toLowerCase()));

            return (
              <div
                key={service.id}
                id={match ? "resultado" : undefined}
                className={
                  match ? "rounded-xl border-2 border-primary p-2" : undefined
                }
              >
                <ServiceItem
                  service={service}
                  barbershop={{
                    name: barbershop.name,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ====================== */}
      {/* Telefones */}
      {/* ====================== */}
      <div className="space-y-3 p-5">
        {barbershop.phones.map((phone) => (
          <PhoneItem key={phone} phone={phone} />
        ))}
      </div>

      {/* Scroll automático para o resultado */}
      {search && <ScrollToResult />}
    </div>
  );
};

export default BarbershopPage;
