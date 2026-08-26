"use server";

import { db } from "@/lib/prisma";

interface GetFixedSchedulesParams {
  barbershopId: string;
  dayOfWeek: number;
}

export const getFixedSchedules = async ({
  barbershopId,
  dayOfWeek,
}: GetFixedSchedulesParams) => {
  const schedules = await db.fixedSchedule.findMany({
    where: {
      barbershopId,
      dayOfWeek,
      active: true,
    },
    select: {
      time: true,
      clientName: true,
    },
    orderBy: {
      time: "asc",
    },
  });

  return schedules;
};
