import Header from "./_components/header";
import { Input } from "./_components/ui/input";
import { Button } from "./_components/ui/button";
import { SearchIcon } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "./_components/ui/card";
import { Badge } from "./_components/ui/badge";
import { Avatar, AvatarImage } from "./_components/ui/avatar";
import { db } from "@/lib/prisma";
import BarbershopItem from "./_components/barbershop-item";

const Home = async () => {
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
            <Button className="gap-2 text-gray-600">
              <Image
                src="/tesoura-e-pente.png"
                alt="Cabelo"
                width={50}
                height={50}
              />
              Cabelo
            </Button>
            <Button className="gap-2 text-gray-600">
              <Image src="/barba.png" alt="Barba" width={50} height={50} />
              Barba
            </Button>
            <Button className="gap-2 text-gray-600">
              <Image
                src="/variante-de-cabelo-masculino.png"
                alt="Pézinho"
                width={50}
                height={50}
              />
              Pézinho
            </Button>
            <Button className="gap-2 text-gray-600">
              <Image
                src="/sobrancelha.png"
                alt="sobrancelha"
                width={50}
                height={50}
              />
              Sobrancelha
            </Button>
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
          <div>
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
                <div className="flex flex-col items-center justify-center px-5 border-l">
                  <p className="text-sm">Ago</p>
                  <p className="text-2xl font-bold">03</p>
                  <p className="text-sm">20h00</p>
                </div>
              </CardContent>
            </Card>
          </div>

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
