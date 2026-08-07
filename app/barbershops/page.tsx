import { db } from "@/lib/prisma";
import Header from "../_components/header";
import Search from "../_components/search";
import { redirect } from "next/navigation";

interface BarbershopsPageProps {
  searchParams: Promise<{
    title?: string;
  }>;
}

const BarbershopsPage = async ({ searchParams }: BarbershopsPageProps) => {
  // Recebe o parâmetro enviado pela URL
  // Exemplo:
  // /barbershops?title=corte
  const { title = "" } = await searchParams;

  // Procura a primeira barbearia que possua
  // o texto digitado em algum dos campos abaixo
  const barbershop = await db.barbershop.findFirst({
    where: {
      OR: [
        {
          // Procura pelo nome
          name: {
            contains: title,
            mode: "insensitive",
          },
        },
        {
          // Procura pela descrição
          description: {
            contains: title,
            mode: "insensitive",
          },
        },
        {
          // Procura pelo endereço
          address: {
            contains: title,
            mode: "insensitive",
          },
        },
        {
          // Procura pelo nome de algum serviço
          services: {
            some: {
              name: {
                contains: title,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    },
  });

  // Caso encontre uma barbearia,
  // redireciona automaticamente
  if (barbershop) {
    redirect(
      `/barbershops/${barbershop.id}?search=${encodeURIComponent(title)}`,
    );
  }

  // Caso não encontre nenhuma,
  // exibe a tela abaixo
  return (
    <div>
      {/* Cabeçalho */}
      <Header />

      {/* Campo de pesquisa */}
      <div className="my-6 px-5">
        <Search />
      </div>

      {/* Mensagem */}
      <div className="px-5">
        <h2 className="text-sm font-semibold">
          Nenhum resultado encontrado para {title}
        </h2>
      </div>
    </div>
  );
};

export default BarbershopsPage;
