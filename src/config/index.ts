import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.join(process.cwd(), ".env"),
});

const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV!,
  PORT: process.env.PORT!,
  DATABASE_URL: process.env.DATABASE_URL!,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN!,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN!,

  // Google Authentication
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,

  // URLs
  BACKEND_URL:
    process.env.BACKEND_URL ?? "http://localhost:5000",

  FRONTEND_URL:
    process.env.FRONTEND_URL ?? "http://localhost:3000",

  // Security
  BCRYPT_SALT_ROUNDS: Number(
    process.env.BCRYPT_SALT_ROUNDS ?? 12
  ),

  // Demo Admin
  SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME!,
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL!,
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD!,

  // Demo Manager
  TESTER_MANAGER_NAME: process.env.TESTER_MANAGER_NAME!,
  TESTER_MANAGER_EMAIL: process.env.TESTER_MANAGER_EMAIL!,
  TESTER_MANAGER_PASSWORD: process.env.TESTER_MANAGER_PASSWORD!,

  // Demo Member
  TESTER_MEMBER_NAME: process.env.TESTER_MEMBER_NAME!,
  TESTER_MEMBER_EMAIL: process.env.TESTER_MEMBER_EMAIL!,
  TESTER_MEMBER_PASSWORD: process.env.TESTER_MEMBER_PASSWORD!,
};

export default config;