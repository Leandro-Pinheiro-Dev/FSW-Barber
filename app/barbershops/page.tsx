import { db } from "@/lib/prisma";
import BarbershopItem from "../_components/barbershop-item";
import Header from "../_components/header";
import Search from "../_components/search";
import { redirect } from "next/navigation";

interface BarbershopsPageProps {
  searchParams: Promise<{
    title?: string;
  }>;
}

const BarbershopsPage = async ({ searchParams }: BarbershopsPageProps) => {
  const { title = "" } = await searchParams;

  const barbershop = await db.barbershop.findFirst({
    where: {
      OR: [
        {
          name: {
            contains: title,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: title,
            mode: "insensitive",
          },
        },
        {
          address: {
            contains: title,
            mode: "insensitive",
          },
        },
        {
          services: {
            some: {
              name: {
                contains: title,
                mode: "insensitive",
              },
            },
          },
        },
        {
          services: {
            some: {
              description: {
                contains: title,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    },
  });

  // Encontrou uma barbearia? Vai direto para ela.
  if (barbershop) {
    redirect(
      `/barbershops/${barbershop.id}?search=${encodeURIComponent(title)}`,
    );
  }

  // Caso não encontre nenhuma
  return (
    <div>
      <Header />

      <div className="my-6 px-5">
        <Search />
      </div>

      <div className="px-5">
        <h2 className="text-sm font-semibold">
          Nenhum resultado encontrado para "{title}"
        </h2>
      </div>
    </div>
  );
};

export default BarbershopsPage;
