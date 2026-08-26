import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    // =====================================================
    // 1. CRIAR / ATUALIZAR A BARBEARIA
    // =====================================================

    const barbershop = await prisma.barbershop.upsert({
      where: {
        name: "Barbearia SpaçoVip",
      },
      update: {
        address: "Av. Mitiharu Tanaka - Conj. Hab. Sao Jose, 671",
        phones: ["(11) 99881-1533"],
        description:
          "Com 20 anos de tradição, a Barbearia SpaçoVip une experiência, técnica e inovação para oferecer cortes modernos e serviços de alta qualidade.\n\nNosso compromisso é proporcionar um atendimento em um ambiente confortável e acolhedor, onde cada cliente recebe uma experiência única.",
      },
      create: {
        name: "Barbearia SpaçoVip",
        address: "Av. Mitiharu Tanaka - Conj. Hab. Sao Jose, 671",
        imageUrl: "https://pt.pngtree.com/free-backgrounds-photos/barbearia",
        phones: ["(11) 99881-1533"],
        description:
          "Com 20 anos de tradição, a Barbearia SpaçoVip une experiência, técnica e inovação para oferecer cortes modernos e serviços de alta qualidade.\n\nNosso compromisso é proporcionar um atendimento em um ambiente confortável e acolhedor, onde cada cliente recebe uma experiência única.",
      },
    });

    // =====================================================
    // 2. SERVIÇOS
    // =====================================================

    const services = [
      {
        name: "Corte de Cabelo",
        description: "Estilo personalizado com as últimas tendências.",
        price: 35.0,
        imageUrl:
          "https://utfs.io/f/0ddfbd26-a424-43a0-aaf3-c3f1dc6be6d1-1kgxo7.png",
      },
      {
        name: "Barba",
        description: "Modelagem completa para destacar sua masculinidade.",
        price: 35.0,
        imageUrl:
          "https://utfs.io/f/e6bdffb6-24a9-455b-aba3-903c2c2b5bde-1jo6tu.png",
      },
      {
        name: "Pézinho",
        description: "Acabamento perfeito para um visual renovado.",
        price: 10.0,
        imageUrl:
          "https://utfs.io/f/8a457cda-f768-411d-a737-cdb23ca6b9b5-b3pegf.png",
      },
      {
        name: "Sobrancelha",
        description: "Modelagem precisa para destacar o olhar.",
        price: 8.0,
        imageUrl:
          "https://utfs.io/f/2118f76e-89e4-43e6-87c9-8f157500c333-b0ps0b.png",
      },
    ];

    // =====================================================
    // 3. CADASTRAR / ATUALIZAR SERVIÇOS
    // =====================================================

    for (const service of services) {
      const existingService = await prisma.barbershopService.findFirst({
        where: {
          barbershopId: barbershop.id,
          name: service.name,
        },
      });

      if (existingService) {
        await prisma.barbershopService.update({
          where: {
            id: existingService.id,
          },
          data: {
            description: service.description,
            price: service.price,
            imageUrl: service.imageUrl,
          },
        });
      } else {
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
    }

    // =====================================================
    // 4. HORÁRIOS FIXOS
    // =====================================================

    const fixedSchedules = [
      // QUINTA-FEIRA
      {
        clientName: "Alan",
        dayOfWeek: 4,
        time: "09:00",
      },
      {
        clientName: "Dada",
        dayOfWeek: 4,
        time: "11:00",
      },
      {
        clientName: "Ricardo",
        dayOfWeek: 4,
        time: "18:00",
      },

      // SEXTA-FEIRA
      {
        clientName: "Cris",
        dayOfWeek: 5,
        time: "08:00",
      },
      {
        clientName: "Diego",
        dayOfWeek: 5,
        time: "09:00",
      },
      {
        clientName: "Igor",
        dayOfWeek: 5,
        time: "11:00",
      },
      {
        clientName: "Weley",
        dayOfWeek: 5,
        time: "13:00",
      },
      {
        clientName: "Alemão",
        dayOfWeek: 5,
        time: "17:00",
      },
      {
        clientName: "Thomas",
        dayOfWeek: 5,
        time: "18:00",
      },
      {
        clientName: "Geba",
        dayOfWeek: 5,
        time: "19:00",
      },
      {
        clientName: "Buiu",
        dayOfWeek: 5,
        time: "20:00",
      },

      // SÁBADO
      {
        clientName: "Joaquim",
        dayOfWeek: 6,
        time: "08:00",
      },
      {
        clientName: "Danilo",
        dayOfWeek: 6,
        time: "09:00",
      },
      {
        clientName: "Big",
        dayOfWeek: 6,
        time: "10:00",
      },
      {
        clientName: "Daniel",
        dayOfWeek: 6,
        time: "11:00",
      },
      {
        clientName: "Peterson",
        dayOfWeek: 6,
        time: "13:00",
      },
      {
        clientName: "Ronaldo",
        dayOfWeek: 6,
        time: "15:00",
      },
      {
        clientName: "Zaca",
        dayOfWeek: 6,
        time: "16:00",
      },
      {
        clientName: "Benny",
        dayOfWeek: 6,
        time: "17:00",
      },
    ];

    // =====================================================
    // 5. EVITAR DUPLICAÇÃO DOS HORÁRIOS
    // =====================================================

    for (const schedule of fixedSchedules) {
      const existingSchedule = await prisma.fixedSchedule.findFirst({
        where: {
          barbershopId: barbershop.id,
          dayOfWeek: schedule.dayOfWeek,
          time: schedule.time,
        },
      });

      if (existingSchedule) {
        await prisma.fixedSchedule.update({
          where: {
            id: existingSchedule.id,
          },
          data: {
            clientName: schedule.clientName,
          },
        });
      } else {
        await prisma.fixedSchedule.create({
          data: {
            barbershopId: barbershop.id,
            clientName: schedule.clientName,
            dayOfWeek: schedule.dayOfWeek,
            time: schedule.time,
          },
        });
      }
    }
    // =====================================================
    // LOGIN DO BARBEIRO
    // =====================================================
    const rafael = await prisma.user.upsert({
      where: {
        email: "rafael.spacovip26@gmail.com",
      },
      update: {
        role: "BARBER",
        name: "Rafael Santos",
      },
      create: {
        email: "rafael.spacovip26@gmail.com",
        name: "Rafael Santos",
        role: "BARBER",
      },
    });

    console.log("Rafael:", rafael);

    // console.log(`👤 Usuários atualizados para BARBER: ${barber.count}`);
    console.log("======================================");
    console.log("✅ Barbearia cadastrada/atualizada!");
    console.log("✅ Serviços cadastrados/atualizados!");
    console.log("✅ Horários fixos cadastrados/atualizados!");
    console.log("======================================");
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
