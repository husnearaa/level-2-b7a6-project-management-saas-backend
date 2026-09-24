// import dotenv from "dotenv";
// import path from "path";


// dotenv.config({path: path.join(process.cwd(), ".env") });


// export default {
//     port : process.env.PORT,
//     database_url : process.env.DATABASE_URL,
//     app_url : process.env.APP_URL,
//     bcrypt_salt_rounds : process.env.BCRYPT_SALT_ROUNDS,
//     jwt_access_secret : process.env.JWT_ACCESS_SECRET,
//     jwt_refresh_secret : process.env.JWT_REFRESH_SECRET,
//     jwt_access_expires_in : process.env.JWT_ACCESS_EXPIRES_IN,
//     jwt_refresh_expires_in : process.env.JWT_REFRESH_EXPIRES_IN,
// }


import { configDotenv } from "dotenv";
import { env } from "process";

configDotenv({
  quiet: true,
});

const config = {
  NODE_ENV: env.NODE_ENV!,
  PORT: env.PORT!,
  DATABASE_URL: env.DATABASE_URL!,

  JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET!,

  STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET!,

//   FRONTEND_URL: env.FRONTEND_URL ?? "http://localhost:3000",

}

export default config