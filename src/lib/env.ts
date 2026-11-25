import { z } from "zod";

const resolvedBaseUrl =
  process.env.APP_BASE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

const envSchema = z.object({
  COMPANY_NAME: z.string().default("VS Techsol"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  MAIL_FROM: z.string().default("VS Techsol Gate Security <gate-security@vstechsol.local>"),
  OTP_PROVIDER: z.enum(["email", "host_screen", "sms_gateway"]).default("email"),
  REQUEST_EXPIRY_MINUTES: z.coerce.number().default(10),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),
  DATABASE_URL: z.string().default(""),
  UPLOAD_DIR: z.string().default("./uploads"),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default("vstechsol_secure_session_secret_key_minimum_32_characters_long"),
});

export const env = envSchema.parse({
  COMPANY_NAME: process.env.COMPANY_NAME,
  APP_BASE_URL: resolvedBaseUrl,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM,
  OTP_PROVIDER: process.env.OTP_PROVIDER,
  REQUEST_EXPIRY_MINUTES: process.env.REQUEST_EXPIRY_MINUTES,
  OTP_EXPIRY_MINUTES: process.env.OTP_EXPIRY_MINUTES,
  DATABASE_URL: process.env.DATABASE_URL,
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  SESSION_SECRET: process.env.SESSION_SECRET,
});
