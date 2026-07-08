import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    // Criar uma única barbearia
    const barbershop = await prisma.barbershop.create({
      data: {
        name: "Barbearia SpaçoVip",
        address: "Av. Mitiharu Tanaka - Conj. Hab. Sao Jose, 671",
        imageUrl: "https://pt.pngtree.com/free-backgrounds-photos/barbearia",
        phones: ["(11) 99881-1533"],
        description:
          "Com 20 anos de tradição, a Barbearia SpaçoVip une experiência, técnica e inovação para oferecer cortes modernos e serviços de alta qualidade. Nosso compromisso é proporcionar um atendimento em um ambiente  confortável e acolhedor, onde cada cliente recebe uma experiência única.",
      },
    });

    // Serviços da barbearia
    const services = [
      {
        name: "Corte de Cabelo",
        description: "Estilo personalizado com as últimas tendências.",
        price: 60.0,
        imageUrl:
          "https://utfs.io/f/0ddfbd26-a424-43a0-aaf3-c3f1dc6be6d1-1kgxo7.png",
      },
      {
        name: "Barba",
        description: "Modelagem completa para destacar sua masculinidade.",
        price: 40.0,
        imageUrl:
          "https://utfs.io/f/e6bdffb6-24a9-455b-aba3-903c2c2b5bde-1jo6tu.png",
      },
      {
        name: "Pézinho",
        description: "Acabamento perfeito para um visual renovado.",
        price: 35.0,
        imageUrl:
          "https://utfs.io/f/8a457cda-f768-411d-a737-cdb23ca6b9b5-b3pegf.png",
      },
      {
        name: "Sobrancelha",
        description: "Modelagem precisa para destacar o olhar.",
        price: 20.0,
        imageUrl:
          "https://utfs.io/f/2118f76e-89e4-43e6-87c9-8f157500c333-b0ps0b.png",
      },
    ];

    // Cadastrar os serviços
    for (const service of services) {
      await prisma.barbershopService.create({
        data: {
          name: service.name,
          description: service.description,
          price: service.price,
          imageUrl: service.imageUrl,
          barbershop: {
            connect: {
              id: barbershop.id,
            },
          },
        },
      });
    }

    console.log("✅ Barbearia cadastrada com sucesso!");
  } catch (error) {
    console.error("Erro ao criar a barbearia:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
