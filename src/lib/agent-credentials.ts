export { agentSchema } from "@/lib/agent-schema";

/** Hashes an agent password with an independent random salt for storage. */
export async function hashAgentPassword(password: string) {
  const { randomBytes, scryptSync } = await import("node:crypto");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
