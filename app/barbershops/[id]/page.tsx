import { db } from "@/lib/prisma";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

interface BarbershopPageProps {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    search?: string;
  }>;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user: {
    name: string | null;
  };
}

const BarbershopPage = async ({
  params,
  searchParams,
}: BarbershopPageProps) => {
  // =====================================================
  // 1. PARÂMETROS
  // =====================================================

  const { id } = await params;
  const { search = "" } = await searchParams;

  // =====================================================
  // 2. BUSCA BARBEARIA
  // =====================================================

  const barbershop = await db.barbershop.findUnique({
    where: {
      id,
    },

    include: {
      services: true,

      reviews: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  // =====================================================
  // 3. BARBEARIA NÃO ENCONTRADA
  // =====================================================

  if (!barbershop) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        Barbearia não encontrada.
      </div>
    );
  }
  // =====================================================
  // 3.1. STATUS DA AVALIAÇÃO DO CLIENTE
  // =====================================================

  const session = await getServerSession(authOptions);

  let hasCompletedBooking = false;
  let hasReviewed = false;

  if (session?.user?.id && session.user.role === "CUSTOMER") {
    const [completedBooking, existingReview] = await Promise.all([
      // Verifica se o cliente já possui algum atendimento
      // concluído nesta barbearia.
      db.booking.findFirst({
        where: {
          userId: session.user.id,
          status: "COMPLETED",
          service: {
            barbershopId: barbershop.id,
          },
        },
        select: {
          id: true,
        },
      }),

      // Verifica se o cliente já avaliou esta barbearia.
      db.review.findUnique({
        where: {
          userId_barbershopId: {
            userId: session.user.id,
            barbershopId: barbershop.id,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    hasCompletedBooking = Boolean(completedBooking);
    hasReviewed = Boolean(existingReview);
  }
  // =====================================================
  // 4. AVALIAÇÕES
  // =====================================================

  const reviews: Review[] = barbershop.reviews;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((total, review) => total + review.rating, 0) /
        reviews.length
      : 0;

  // =====================================================
  // 5. SERVIÇOS
  // =====================================================

  const services = barbershop.services.map((service) => ({
    ...service,
    price: Number(service.price),
  }));

  // =====================================================
  // 6. BUSCA
  // =====================================================

  const normalizedSearch = search.toLowerCase().trim();

  // =====================================================
  // 7. RENDERIZAÇÃO
  // =====================================================

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl">
      {/* ===================================================
          BANNER
      =================================================== */}

      <section className="relative h-64 w-full overflow-hidden sm:h-80 md:h-96 lg:rounded-2xl">
        <Image
          src="/detalhes.jpeg"
          alt={barbershop.name}
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1024px"
          className="object-cover"
        />

        {/* Gradiente para melhorar visibilidade dos botões */}
        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/20" />

        {/* =================================================
            BOTÕES DO BANNER
        ================================================= */}

        <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between sm:inset-x-5 sm:top-5">
          {/* VOLTAR */}

          <Link href="/">
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full shadow-md sm:h-10 sm:w-10"
            >
              <ChevronLeftIcon size={20} />
            </Button>
          </Link>

          {/* MENU */}

          <Sheet>
            <SheetTrigger
              render={
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 rounded-full shadow-md sm:h-10 sm:w-10"
                />
              }
            >
              <MenuIcon size={20} />
            </SheetTrigger>

            <SideBarSheet />
          </Sheet>
        </div>
      </section>

      {/* ===================================================
          INFORMAÇÕES
      =================================================== */}

      <section className="border-b px-4 py-5 sm:px-5 sm:py-6">
        <h1 className="mb-3 text-xl font-bold sm:text-2xl">
          {barbershop.name}
        </h1>

        {/* ENDEREÇO */}

        <div className="mb-3 flex items-start gap-2">
          <MapPinIcon size={18} className="mt-0.5 shrink-0 text-primary" />

          <p className="text-sm leading-5 text-muted-foreground sm:text-base">
            {barbershop.address}
          </p>
        </div>

        {/* AVALIAÇÃO */}

        <div className="flex items-center gap-2">
          <StarIcon size={18} className="fill-primary text-primary" />

          <p className="text-sm sm:text-base">
            {averageRating > 0 ? averageRating.toFixed(1) : "Sem avaliações"} (
            {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}
            )
          </p>
        </div>
      </section>

      {/* ===================================================
          SOBRE
      =================================================== */}

      <section className="space-y-3 border-b px-4 py-5 sm:px-5 sm:py-6">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Sobre nós
        </h2>

        <p className="text-sm leading-6 sm:text-base">
          {barbershop.description}
        </p>
      </section>

      {/* ===================================================
          SERVIÇOS
      =================================================== */}

      <section className="space-y-4 border-b px-4 py-5 sm:px-5 sm:py-6">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Serviços
        </h2>

        <div className="space-y-3">
          {services.map((service) => {
            const match =
              normalizedSearch.length > 0 &&
              (service.name.toLowerCase().includes(normalizedSearch) ||
                service.description.toLowerCase().includes(normalizedSearch));

            return (
              <div
                key={service.id}
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
      </section>

      {/* ===================================================
          AVALIAÇÕES
      =================================================== */}

      <section className="space-y-5 border-b px-4 py-5 sm:px-5 sm:py-6">
        {/* CABEÇALHO */}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Avaliações
            </h2>

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
          <ReviewForm
            barbershopId={barbershop.id}
            hasCompletedBooking={hasCompletedBooking}
            hasReviewed={hasReviewed}
          />
        </div>

        {/* LISTA */}

        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não existem avaliações. Seja o primeiro a avaliar!
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="rounded-xl border p-4">
                {/* NOME + ESTRELAS */}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold">
                    {review.user.name || "Cliente"}
                  </p>

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

                {/* COMENTÁRIO */}

                {review.comment && (
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    {review.comment}
                  </p>
                )}

                {/* DATA */}

                <p className="mt-2 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("pt-BR").format(
                    new Date(review.createdAt),
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===================================================
          TELEFONES
      =================================================== */}

      <section className="space-y-3 px-4 py-5 sm:px-5 sm:py-6">
        {barbershop.phones.map((phone) => (
          <PhoneItem key={phone} phone={phone} />
        ))}
      </section>

      {/* ===================================================
          SCROLL DA BUSCA
      =================================================== */}

      {search && <ScrollToResult />}
    </div>
  );
};

export default BarbershopPage;
