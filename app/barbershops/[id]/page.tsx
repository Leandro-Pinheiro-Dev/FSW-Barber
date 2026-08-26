import { db } from "@/lib/prisma";

import Link from "next/link";
import Image from "next/image";

import { Button } from "@/app/_components/ui/button";

import { ChevronLeftIcon, MapPinIcon, MenuIcon, StarIcon } from "lucide-react";

import ServiceItem from "@/app/_components/service-item";
import PhoneItem from "@/app/_components/phone-item";

import { Sheet, SheetTrigger } from "@/app/_components/ui/sheet";
import SideBarSheet from "@/app/_components/sidebar-sheet";

import ScrollToResult from "@/app/_components/scroll-to-result";

import ReviewForm from "@/app/_components/review-form";

/**
 * ============================================================
 * TIPOS DA PÁGINA
 * ============================================================
 *
 * No Next.js 16, params e searchParams podem ser Promises.
 */
interface BarbershopPageProps {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    search?: string;
  }>;
}

/**
 * ============================================================
 * TIPAGEM DA AVALIAÇÃO
 * ============================================================
 *
 * Essa tipagem evita o problema:
 *
 * "Property 'length' does not exist on type 'never'"
 *
 * Também deixa explícito para o TypeScript quais dados
 * estamos utilizando de cada avaliação.
 */
interface Review {
  id: string;

  rating: number;

  comment: string | null;

  createdAt: Date;

  user: {
    name: string | null;
  };
}

/**
 * ============================================================
 * PÁGINA DA BARBEARIA
 * ============================================================
 */
const BarbershopPage = async ({
  params,
  searchParams,
}: BarbershopPageProps) => {
  /**
   * ==========================================================
   * 1. PEGA O ID DA BARBEARIA
   * ==========================================================
   *
   * Exemplo:
   *
   * /barbershops/cmm123abc
   *
   * O "id" será:
   *
   * cmm123abc
   */
  const { id } = await params;

  /**
   * ==========================================================
   * 2. PEGA O TEXTO DA BUSCA
   * ==========================================================
   *
   * Caso a URL tenha:
   *
   * ?search=corte
   *
   * teremos:
   *
   * search = "corte"
   *
   * Caso não exista, usamos uma string vazia.
   */
  const { search = "" } = await searchParams;

  /**
   * ==========================================================
   * 3. BUSCA A BARBEARIA NO BANCO
   * ==========================================================
   *
   * Estamos buscando:
   *
   * - serviços
   * - avaliações
   * - usuário que fez cada avaliação
   *
   * Assim conseguimos mostrar:
   *
   * Cliente:
   * "Leandro"
   *
   * Nota:
   * ⭐⭐⭐⭐⭐
   *
   * Comentário:
   * "Excelente atendimento!"
   */
  const barbershop = await db.barbershop.findUnique({
    where: {
      id,
    },

    include: {
      /**
       * Serviços da barbearia
       */
      services: true,

      /**
       * Avaliações
       */
      reviews: {
        include: {
          /**
           * Pegamos somente o nome do cliente.
           *
           * Não precisamos trazer email, id etc.
           */
          user: {
            select: {
              name: true,
            },
          },
        },

        /**
         * Mais recentes primeiro.
         */
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  /**
   * ==========================================================
   * 4. BARBEARIA NÃO ENCONTRADA
   * ==========================================================
   */
  if (!barbershop) {
    return (
      <div className="flex h-screen items-center justify-center">
        Barbearia não encontrada.
      </div>
    );
  }

  /**
   * ==========================================================
   * 5. CRIA UMA CONSTANTE PARA AS AVALIAÇÕES
   * ==========================================================
   *
   * Essa linha é importante.
   *
   * Em vez de ficar utilizando:
   *
   * barbershop.reviews.length
   *
   * várias vezes, trabalhamos com uma variável própria.
   *
   * Isso também ajuda o TypeScript a manter a inferência
   * correta.
   */
  const reviews: Review[] = barbershop.reviews;

  /**
   * ==========================================================
   * 6. CALCULA A MÉDIA DAS AVALIAÇÕES
   * ==========================================================
   *
   * Exemplo:
   *
   * Avaliações:
   *
   * 5
   * 4
   * 5
   *
   * Média:
   *
   * (5 + 4 + 5) / 3 = 4.67
   */
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((total, review) => total + review.rating, 0) /
        reviews.length
      : 0;

  /**
   * ==========================================================
   * 7. CONVERTE O DECIMAL DOS SERVIÇOS
   * ==========================================================
   *
   * O Prisma pode retornar Decimal.
   *
   * Server Components não devem passar objetos Decimal
   * diretamente para Client Components.
   *
   * Por isso:
   *
   * price: Number(service.price)
   *
   * transforma:
   *
   * Decimal(35)
   *
   * em:
   *
   * 35
   */
  const services = barbershop.services.map((service) => ({
    ...service,
    price: Number(service.price),
  }));

  /**
   * ==========================================================
   * 8. NORMALIZA O TEXTO DA BUSCA
   * ==========================================================
   *
   * Evita repetir:
   *
   * search.toLowerCase()
   */
  const normalizedSearch = search.toLowerCase().trim();

  /**
   * ==========================================================
   * 9. RENDERIZAÇÃO
   * ==========================================================
   */
  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* ======================================================
          BANNER DA BARBEARIA
      ====================================================== */}

      <div className="relative h-120 w-full overflow-hidden rounded-2xl">
        <Image
          src="/detalhes.jpeg"
          alt={barbershop.name}
          fill
          priority
          className="object-cover"
        />

        {/* Botões sobre o banner */}

        <div className="absolute inset-x-4 top-4 z-10 flex justify-between">
          {/* Menu lateral */}

          <Sheet>
            <SheetTrigger render={<Button size="icon" variant="secondary" />}>
              <MenuIcon size={20} />
            </SheetTrigger>

            <SideBarSheet />
          </Sheet>

          {/* Voltar para a página inicial */}

          <Link href="/">
            <Button size="icon" variant="secondary">
              <ChevronLeftIcon size={20} />
            </Button>
          </Link>
        </div>
      </div>

      {/* ======================================================
          INFORMAÇÕES DA BARBEARIA
      ====================================================== */}

      <div className="border-b p-5 pt-8">
        <h1 className="mb-3 text-xl font-bold">{barbershop.name}</h1>

        {/* Endereço */}

        <div className="mb-2 flex items-center gap-2">
          <MapPinIcon size={18} className="text-primary" />

          <p className="text-sm">{barbershop.address}</p>
        </div>

        {/* Avaliação geral */}

        <div className="flex items-center gap-2">
          <StarIcon size={18} className="fill-primary text-primary" />

          <p className="text-sm">
            {averageRating > 0 ? averageRating.toFixed(1) : "Sem avaliações"} (
            {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}
            )
          </p>
        </div>
      </div>

      {/* ======================================================
          SOBRE A BARBEARIA
      ====================================================== */}

      <div className="space-y-3 border-b p-5">
        <h2 className="text-xs font-bold uppercase text-gray-400">Sobre nós</h2>

        <p className="text-justify text-sm">{barbershop.description}</p>
      </div>

      {/* ======================================================
          SERVIÇOS
      ====================================================== */}

      <div className="space-y-3 border-b p-5">
        <h2 className="mb-3 text-xs font-bold uppercase text-gray-400">
          Serviços
        </h2>

        <div className="space-y-3">
          {services.map((service) => {
            /**
             * Verifica se o serviço corresponde à pesquisa.
             *
             * Procuramos tanto no nome quanto na descrição.
             */
            const match =
              normalizedSearch.length > 0 &&
              (service.name.toLowerCase().includes(normalizedSearch) ||
                service.description.toLowerCase().includes(normalizedSearch));

            return (
              <div
                key={service.id}

                /**
                 * Se encontrou o serviço,
                 * adicionamos o id "resultado".
                 *
                 * O componente ScrollToResult usa esse id.
                 */
                id={match ? "resultado" : undefined}

                className={
                  match ? "rounded-xl border-2 border-primary p-2" : undefined
                }
              >
                <ServiceItem
                  service={service}

                  barbershop={{
                    name: barbershop.name,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================
          AVALIAÇÕES
      ====================================================== */}

      <div className="space-y-5 border-b p-5">
        {/* Cabeçalho da seção */}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase text-gray-400">
              Avaliações
            </h2>

            {/* Média */}

            <div className="mt-2 flex items-center gap-2">
              <StarIcon size={20} className="fill-primary text-primary" />

              <span className="font-bold">
                {averageRating > 0 ? averageRating.toFixed(1) : "0,0"}
              </span>

              <span className="text-sm text-muted-foreground">
                ({reviews.length})
              </span>
            </div>
          </div>

          {/* ==================================================
              BOTÃO PARA AVALIAR
              
              O ReviewForm verifica o login pelo NextAuth
              antes de permitir o envio.
          ================================================== */}

          <ReviewForm barbershopId={barbershop.id} />
        </div>

        {/* ====================================================
            LISTA DE AVALIAÇÕES
        ==================================================== */}

        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não existem avaliações. Seja o primeiro a avaliar!
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="rounded-xl border p-4">
                {/* Nome + estrelas */}

                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">
                    {review.user.name || "Cliente"}
                  </p>

                  {/* Estrelas */}

                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        size={16}
                        className={
                          star <= review.rating
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Comentário */}

                {review.comment && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                )}

                {/* Data */}

                <p className="mt-2 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("pt-BR").format(
                    new Date(review.createdAt),
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================
          TELEFONES
      ====================================================== */}

      <div className="space-y-3 p-5">
        {barbershop.phones.map((phone) => (
          <PhoneItem key={phone} phone={phone} />
        ))}
      </div>

      {/* ======================================================
          SCROLL AUTOMÁTICO
      ====================================================== */}

      {search && <ScrollToResult />}
    </div>
  );
};

export default BarbershopPage;
