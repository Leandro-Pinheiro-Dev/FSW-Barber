import { db } from "@/lib/prisma";
import Link from "next/link";

import { Button } from "@/app/_components/ui/button";
import { ChevronLeftIcon, MapPinIcon, MenuIcon, StarIcon } from "lucide-react";
import Image from "next/image";
import ServiceItem from "@/app/_components/service-item";
import PhoneItem from "@/app/_components/phone-item";
import { Sheet, SheetTrigger } from "@/app/_components/ui/sheet";
import SideBarSheet from "@/app/_components/sidebar-sheet";

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
  const { id } = await params;
  const { search = "" } = await searchParams;

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
      {/* IMAGEM */}
      <div className="relative h-120 w-full overflow-hidden rounded-2xl">
        <Image
          src="/detalhes.jpeg"
          alt={barbershop.name}
          fill
          className="object-cover"
          unoptimized
        />

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

      {/* TÍTULO */}
      <div className="border-b p-5 pt-8">
        <h1 className="mb-3 mt-2 text-xl font-bold">{barbershop.name}</h1>

        <div className="mb-2 flex items-center gap-2">
          <MapPinIcon className="text-primary" size={18} />
          <p className="text-sm">{barbershop.address}</p>
        </div>

        <div className="flex items-center gap-2">
          <StarIcon className="fill-primary text-primary" size={18} />
          <p className="text-sm">5,0 (80 avaliações)</p>
        </div>
      </div>

      {/* DESCRIÇÃO */}
      <div className="space-y-3 border-b p-5">
        <h2 className="text-xs font-bold uppercase text-gray-400">Sobre Nós</h2>

        <p className="text-sm text-justify">{barbershop.description}</p>
      </div>

      {/* SERVIÇOS */}
      <div className="space-y-3 border-b p-5">
        <h2 className="mb-3 text-xs font-bold uppercase text-gray-400">
          Serviços
        </h2>

        <div className="space-y-3">
          {barbershop.services.map((service) => {
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
                <ServiceItem service={service} />
              </div>
            );
          })}
        </div>
      </div>

      {/* CONTATO */}
      <div className="space-y-3 p-5">
        {barbershop.phones.map((phone) => (
          <PhoneItem key={phone} phone={phone} />
        ))}
      </div>

      {/* Scroll automático */}
      {search && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener("load", () => {
                const el = document.getElementById("resultado");
                if (el) {
                  el.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                  });
                }
              });
            `,
          }}
        />
      )}
    </div>
  );
};

export default BarbershopPage;
