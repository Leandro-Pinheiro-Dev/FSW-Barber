import Image from "next/image";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { CalendarIcon, HomeIcon, LogOutIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { quickSearchOptions } from "../_constants/search";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const Header = () => {
  return (
    <Card>
      <CardContent className="justify-between items-center flex flex-row p-5">
        <Image
          alt="SpaçoVip"
          src="/LOGO_Spacovip.jpeg"
          height={150}
          width={150}
        />

        {/* TELA DE USUARIO*/}
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            <MenuIcon />
          </SheetTrigger>

          <SheetContent>
            <SheetHeader className="mt-8">
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>

            <div className="py-5 border-b border-solid flex items-center gap-3">
              <Avatar>
                <AvatarImage src="/avatar.png" alt="Usuário" />
                <AvatarFallback>LP</AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <p className="font-bold">Leandro Pinheiro</p>
                <p className="text-xs text-muted-foreground">lp@yahoo.com</p>
              </div>
            </div>

            <div className="py-5 flex flex-col gap-2 border-b border-solid">
              <SheetClose>
                <Link href="/" className="w-full">
                  <Button
                    className="gap-2 justify-start w-full"
                    variant="ghost"
                  >
                    <HomeIcon size={18} />
                    Início
                  </Button>
                </Link>
              </SheetClose>

              <SheetClose>
                <Link href="/agendamentos" className="w-full">
                  <Button
                    className="gap-2 justify-start w-full"
                    variant="ghost"
                  >
                    <CalendarIcon size={18} />
                    Agendamentos
                  </Button>
                </Link>
              </SheetClose>
            </div>

            <div className="py-5 flex flex-col gap-2 border-b border-solid ">
              {quickSearchOptions.map((option) => (
                <Button
                  key={option.title}
                  className=" justify-start gap-2 "
                  variant="ghost"
                >
                  <Image
                    alt={option.title}
                    src={option.imageUrl}
                    height={18}
                    width={18}
                  />
                  {option.title}
                </Button>
              ))}
            </div>

            <div className="py-5 flex flex-col gap-2 border-b border-solid">
              <Button variant="ghost" className=" justify-start">
                <LogOutIcon size={18} />
                Sair da Conta
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
};

export default Header;
