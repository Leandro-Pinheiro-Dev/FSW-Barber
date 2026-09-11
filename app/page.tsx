import Header from "./_components/header";

import { Button } from "./_components/ui/button";

import { quickSearchOptions } from "./_constants/search";

import Search from "./_components/search";

import Image from "next/image";

import BarbershopItem from "./_components/barbershop-item";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { MessageCircle } from "lucide-react";

const Home = async () => {
  // =====================================================
  // VERIFICA AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  // -----------------------------------------------------
  // USUÁRIO NÃO LOGADO
  // -----------------------------------------------------
  // Não permite acessar a aplicação sem autenticação.
  // Primeiro passa pela tela de login.
  if (!session?.user) {
    redirect("/login");
  }

  // -----------------------------------------------------
  // BARBEIRO
  // -----------------------------------------------------
  // Rafael não deve acessar a tela de cliente.
  // Ele vai diretamente para o painel administrativo.
  if (session.user.role === "BARBER") {
    redirect("/barbeiro/dashboard");
  }

  // =====================================================
  // A PARTIR DAQUI É CUSTOMER
  // =====================================================

  const today = new Date();

  const Barbershops = await db.barbershop.findMany();

  return (
    <div className="flex min-h-screen justify-center">
      <div className="w-full max-w-5xl">
        <Header />

        <div className="space-y-6 p-5">
          {/* BOAS-VINDAS */}
          <div>
            <h2 className="text-xl font-bold">
              Olá, {session?.user?.name?.split(" ")[0] || "Cliente"}!
            </h2>

            <p className="text-sm capitalize text-muted-foreground">
              {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}.
            </p>
          </div>

          {/* BUSCA */}
          <div className="mt-6 flex items-center gap-2">
            <Search />
          </div>

          {/* BUSCA RÁPIDA */}
          <div className="mt-6 flex gap-4">
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
          <div className="relative h-120 w-full overflow-hidden rounded-2xl">
            <Image
              src="/home.jpeg"
              alt="Banner da barbearia"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>

          {/* BARBEARIAS */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-muted-foreground">
              <Image
                alt="Ícone de barbeiro"
                src="/poste-de-barbeiro.png"
                width={22}
                height={22}
                className="brightness-0 invert"
              />
              Barbearia
            </div>

            <div className="flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {Barbershops.map((barbershop) => (
                <BarbershopItem key={barbershop.id} barbershop={barbershop} />
              ))}
            </div>
          </div>
          {/* LOCALIZAÇÃO */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-muted-foreground">
              <Image
                alt="localizacao"
                src="/localizacao.png"
                width={22}
                height={22}
                className="brightness-0 invert"
              />
              Localização
            </div>
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
                Sebastião Batista de Oliveira - Conj. Hab. Sao Jose, 157
              </p>

              <p className="text-sm text-muted-foreground">
                Campo Limpo Paulista - SP
              </p>
              <a
                href="https://wa.me/5511998821533?text=Olá!%20Gostaria%20de%20agendar%20um%20horário%20na%20Barbearia%20SpaçoVip."
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="mt-4 w-full gap-2">
                  <MessageCircle size={18} />
                  Falar pelo WhatsApp
                </Button>
              </a>
              <a
                href="https://www.instagram.com/spaco_vip_rafael/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="mt-3 w-full gap-2">
                  <Image
                    src="/logotipo-do-instagram.png"
                    alt="Instagram"
                    width={18}
                    height={18}
                  />
                  Instagram
                </Button>
              </a>
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
