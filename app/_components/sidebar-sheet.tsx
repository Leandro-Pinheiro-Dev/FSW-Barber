import Image from "next/image";
import { Button, buttonVariants } from "./ui/button";
import { CalendarIcon, HomeIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { SheetClose, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { quickSearchOptions } from "../_constants/search";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";

const SideBarSheet = () => {
  return (
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
        <SheetClose render={<Link href="/" />}>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full justify-start gap-2",
            )}
          >
            <HomeIcon size={18} />
            Início
          </Link>
        </SheetClose>

        <SheetClose>
          <Button
            render={<Link href="/agendamentos" />}
            variant="ghost"
            className="w-full justify-start gap-2"
          >
            <CalendarIcon size={18} />
            Agendamentos
          </Button>
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
  );
};

export default SideBarSheet;
