import Header from "./_components/header";
import { Input } from "./_components/ui/input";
import { Button } from "./_components/ui/button";
import { SearchIcon } from "lucide-react";
import { Badge } from "./_components/ui/badge";
import Image from "next/image";
import { Card, CardContent } from "./_components/ui/card";
import { Avatar, AvatarImage } from "./_components/ui/avatar";

const Home = () => {
  return (
    <div>
      {/*header*/}
      <Header />
      <div className="p-5">
        {/*TEXTO*/}
        <h2 className="text-xl font-bold"> Olá, Cliente! </h2>
        <p>Quinta-Feira, 02 de Julho.</p>
        {/*BUSCA*/}
        <div className="flex items-center gap-2 mt-6">
          <Input placeholder="Faça Sua Busca.."></Input>
          <Button>
            <SearchIcon />
          </Button>
        </div>
        {/*IMAGEM*/}
        <div className="relative w-full h-44 mt-6 ">
          <Image
            src="/banner4.jpeg"
            alt="Banner da barbearia"
            fill
            className="rounded-xl object-cover"
          />
        </div>
        {/*AGENDAMENTO*/}
        <Card className="mt-6">
          <CardContent className="flex justify-between p-0">
            {/*ESQUERDA*/}
            <div className="flex flex-col gap-2 py-5 pl-5">
              <Badge className="w-fit"> Confirmado </Badge>
              <h3 className="font-semibold">Corte de cabelo</h3>

              <div className="flex items-center gap-2">
                <Avatar className="h-6 m-6">
                  <AvatarImage src="https://utfs.io/f/c97a2dc9-cf62-468b-a851-bfd2bdde775f-16p.png" />
                </Avatar>
                <p className="text-sm">Barbearia SpaçoVip</p>
              </div>
            </div>
            {/*DIREITA*/}
            <div className="flex flex-col items-center justify-center px-5 border-l-2 border-solid">
              <p className="text-sm">Agosto</p>
              <p className="text-2xl">03</p>
              <p className="text-sm">20h00</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
