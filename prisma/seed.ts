import bcrypt from "bcryptjs";
import { Role } from "./generated/prisma/enums";
import config from "../src/config";
import { prisma } from "../src/lib/prisma";

const seedAdmin = async () => {
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: config.SUPER_ADMIN_EMAIL,
    },
  });

  if (existingAdmin) {
    console.log("Admin already exists!");
    return;
  }

  const hashedPassword = await bcrypt.hash(
    config.SUPER_ADMIN_PASSWORD,
    config.BCRYPT_SALT_ROUNDS,
  );

  const admin = await prisma.user.create({
    data: {
      name: config.SUPER_ADMIN_NAME,
      email: config.SUPER_ADMIN_EMAIL,
      password: hashedPassword,

      role: Role.ADMIN,
      status: "ACTIVE",

      authProvider: "CREDENTIAL",
      emailVerified: true,
    },
  });

  console.log("Admin created:", admin.email);
};

const seedManager = async () => {
  const existingManager = await prisma.user.findUnique({
    where: {
      email: config.TESTER_MANAGER_EMAIL,
    },
  });

  if (existingManager) {
    console.log("Manager already exists!");
    return;
  }

  const hashedPassword = await bcrypt.hash(
    config.TESTER_MANAGER_PASSWORD,
    config.BCRYPT_SALT_ROUNDS,
  );

  const manager = await prisma.user.create({
    data: {
      name: config.TESTER_MANAGER_NAME,
      email: config.TESTER_MANAGER_EMAIL,
      password: hashedPassword,

      role: Role.MANAGER,
      status: "ACTIVE",

      authProvider: "CREDENTIAL",
      emailVerified: true,
    },
  });

  console.log("Manager created:", manager.email);
};

const seedMember = async () => {
  const existingMember = await prisma.user.findUnique({
    where: {
      email: config.TESTER_MEMBER_EMAIL,
    },
  });

  if (existingMember) {
    console.log("Member already exists!");
    return;
  }

  const hashedPassword = await bcrypt.hash(
    config.TESTER_MEMBER_PASSWORD,
    config.BCRYPT_SALT_ROUNDS,
  );

  const member = await prisma.user.create({
    data: {
      name: config.TESTER_MEMBER_NAME,
      email: config.TESTER_MEMBER_EMAIL,
      password: hashedPassword,

      role: Role.MEMBER,
      status: "ACTIVE",

      authProvider: "CREDENTIAL",
      emailVerified: true,
    },
  });

  console.log("Member created:", member.email);
};

const main = async () => {
  try {
    console.log("🌱 Starting database seed...");

    await seedAdmin();
    await seedManager();
    await seedMember();

    console.log("🌱 Database seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

main();
