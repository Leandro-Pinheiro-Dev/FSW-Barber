import Header from "./_components/header";
import BookingItem from "./_components/booking-item";

import { Input } from "./_components/ui/input";
import { Button } from "./_components/ui/button";

import { quickSearchOptions } from "./_constants/search";

import { SearchIcon } from "lucide-react";
import Image from "next/image";

import BarbershopItem from "./_components/barbershop-item";
import { db } from "@/lib/prisma";

const Home = async () => {
  // Buscar a barbearia cadastrada
  const Barbershops = await db.barbershop.findMany();

  return (
    <div className="flex min-h-screen justify-center">
      <div className="w-full max-w-5xl">
        <Header />

        <div className="space-y-6 p-5">
          {/* BOAS-VINDAS */}
          <div>
            <h2 className="text-xl font-bold">Olá, Cliente!</h2>
            <p className="text-sm text-muted-foreground">
              Quinta-feira, 02 de Julho.
            </p>
          </div>

          {/* BUSCA */}
          <div className="mt-6 flex items-center gap-2">
            <Input placeholder="Faça sua busca..." />

            <Button>
              <SearchIcon />
            </Button>
          </div>

          {/* BUSCA RÁPIDA */}
          <div className="mt-6 flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {quickSearchOptions.map((option) => (
              <Button key={option.title} className="gap-5 text-gray-600">
                <Image
                  src={option.imageUrl}
                  alt={option.title}
                  width={50}
                  height={50}
                />

                {option.title}
              </Button>
            ))}
          </div>

          {/* BANNER */}
          <div className="relative mx-auto h-120 w-full max-w-2x1 overflow-hidden rounded-2xl">
            <Image
              src="/home.jpeg"
              alt="Banner da barbearia"
              fill
              className="object-contain"
            />
          </div>
          {/* BARBEARIAS */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
              💈 Barbearia
            </h2>

            <div className="flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {Barbershops.map((barbershop) => (
                <BarbershopItem key={barbershop.id} barbershop={barbershop} />
              ))}
            </div>
          </div>
          {/* AGENDAMENTOS */}
          <BookingItem />

          {/* BARBEARIA */}
          {/* LOCALIZAÇÃO */}
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
              📍 Localização
            </h2>

            <div className="overflow-hidden rounded-2xl border">
              <iframe
                src="https://www.google.com/maps/embed?pb=!3m2!1spt-BR!2sbr!4v1783143520245!5m2!1spt-BR!2sbr!6m8!1m7!1sTwe24M4lI-PSKZXPUayA4w!2m2!1d-23.21381344881015!2d-46.76093419562097!3f53.264221881845536!4f-7.647442068245411!5f0.7820865974627469"
                width="100%"
                height="350"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            <div className="mt-4">
              <h3 className="font-semibold">Barbearia SpaçoVip</h3>

              <p className="text-sm text-muted-foreground">
                Av. Mitiharu Tanaka - Conj. Hab. Sao Jose, 671
              </p>

              <p className="text-sm text-muted-foreground">
                Campo Limpo Paulista - SP
              </p>
            </div>

            <a
              href="https://maps.app.goo.gl/GP4oFqw8t9vRyjAe6"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="mt-4 w-full">Ver rota</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
