import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      authProvider: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(403, "Your account is not active");
  }

  return user;
};

export const userService = {
  getMyProfile,
};