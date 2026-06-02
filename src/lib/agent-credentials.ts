import { z } from "zod";

export const agentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  countryCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Country code must be like +91"),
  mobile: z
    .string()
    .trim()
    .regex(/^\d{6,15}$/, "Mobile must be 6-15 digits"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72)
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/\d/, "Password must include a number"),
});

/** Hashes an agent password with an independent random salt for storage. */
export async function hashAgentPassword(password: string) {
  const { randomBytes, scryptSync } = await import("node:crypto");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
