import { Input } from "@base-ui/react";
import Header from "./_components/header";
import { Button } from "@base-ui/react";
import { SearchIcon } from "lucide-react";
import Image from "next/image";

const Home = () => {
  return (
    <div>
      {/*header*/}
      <Header />
      <div className="p-5">
        <h2 className="text-xl font-bold"> Olá, Cliente! </h2>
        <p>Quinta-Feira, 02 de Julho.</p>

        <div className="flex items-center gap-2 mt-6">
          <Input placeholder="Faça Sua Busca.."></Input>
          <Button>
            <SearchIcon />
          </Button>
        </div>

        <div className="relative w-full h-42.5 mt-6 ">
          <Image
            src="/banner4.jpeg"
            alt="Banner da barbearia"
            fill
            className="rounded-xl object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
