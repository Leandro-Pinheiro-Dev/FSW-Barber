import Image from "next/image";
import { Button, buttonVariants } from "./ui/button";
import { CalendarIcon, HomeIcon, LogInIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { SheetClose, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { quickSearchOptions } from "../_constants/search";
//import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const SideBarSheet = () => {
  return (
    <SheetContent>
      <SheetHeader className="mt-8">
        <SheetTitle className="text-left">Menu</SheetTitle>
      </SheetHeader>

      <div className="relative flex items-center justify-end border-b py-5">
        <h2 className="absolute left-1/2 -translate-x-1/2 font-bold">
          Olá, Faça seu Login!
        </h2>

        <Dialog>
          <DialogTrigger render={<Button size="icon" className="mr-18" />}>
            <LogInIcon />
          </DialogTrigger>

          <DialogContent className="w-[90%]">
            <DialogHeader>
              <DialogTitle>Faça seu Login na Plataforma</DialogTitle>
              <DialogDescription>
                Conecte-se usando sua conta do Google.
              </DialogDescription>
            </DialogHeader>

            <Button variant="outline" className="gap-1 font-bold">
              <Image
                alt="Fazer login com o Google"
                src="/google.png"
                width={18}
                height={18}
              />
              Google
            </Button>
          </DialogContent>
        </Dialog>
        {/* <Avatar>
          <AvatarImage src="/avatar.png" alt="Usuário" />
          <AvatarFallback>LP</AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <p className="font-bold">Leandro Pinheiro</p>
          <p className="text-xs text-muted-foreground">lp@yahoo.com</p>
        </div> */}
      </div>

      <div className="py-5 flex flex-col gap-2 border-b border-solid">
        <SheetClose
          nativeButton={false}
          render={
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-2",
              )}
            />
          }
        >
          <HomeIcon size={18} />
          Início
        </SheetClose>

        <SheetClose
          nativeButton={false}
          render={
            <Link
              href="/agendamentos"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-2",
              )}
            />
          }
        >
          <CalendarIcon size={18} />
          Agendamentos
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
