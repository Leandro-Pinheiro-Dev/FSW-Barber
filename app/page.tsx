import Header from "./_components/header";
import { Input } from "./_components/ui/input";
import { Button } from "./_components/ui/button";
import { SearchIcon } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "./_components/ui/card";
import { db } from "@/lib/prisma";
import BarbershopItem from "./_components/barbershop-item";
import { quickSearchOptions } from "./_constants/search";
import BookingItem from "./_components/booking-item";

const Home = async () => {
  //CHAMAR BANCO DE DADOS
  const barbershops = await db.barbershop.findMany();

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-5xl">
        <Header />

        <div className="p-5 space-y-6">
          {/* BOAS-VINDAS */}
          <div>
            <h2 className="text-xl font-bold">Olá, Cliente!</h2>
            <p className="text-sm text-muted-foreground">
              Quinta-Feira, 02 de Julho.
            </p>
          </div>

          {/* BUSCA */}
          <div className="mt-6 flex items-center gap-2 ">
            <Input placeholder="Faça sua busca..." />
            <Button>
              <SearchIcon />
            </Button>
          </div>

          {/* BUSCAR RAPIDA */}
          <div className=" mt-6 flex gap-3 overflow-x-scroll [&::-webkit-scrollbar]:hidden">
            {quickSearchOptions.map((option) => (
              <Button className="gap-2 text-gray-600" key={option.title}>
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
          <div className="relative w-full h-120 overflow-hidden">
            <Image
              src="/banner4.jpeg"
              alt="Banner da barbearia"
              fill
              className="object-cover"
            />
          </div>

          {/* AGENDAMENTO */}
          <BookingItem />

          {/* RECOMENDADOS */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
              Recomendados
            </h2>

            <div className="flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {barbershops.map((barbershop) => (
                <BarbershopItem key={barbershop.id} barbershop={barbershop} />
              ))}
            </div>
            <footer>
              <Card className="mt-8">
                <CardContent className="px-5 py-6">
                  <p className="text-sm text-gray-400">
                    © 2026 Copyright{" "}
                    <span className="font-bold">FSW Barber</span>
                  </p>
                </CardContent>
              </Card>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
