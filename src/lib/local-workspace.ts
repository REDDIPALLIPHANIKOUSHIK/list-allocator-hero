import { agentSchema } from "@/lib/agent-schema";
import { allocateAgentIds, REQUIRED_AGENT_COUNT } from "@/lib/allocation";
import type { ParsedItem } from "@/lib/csv-parser";

const ACCOUNTS_KEY = "listflow.local.accounts";
const SESSION_KEY = "listflow.local.session";
const WORKSPACE_PREFIX = "listflow.local.workspace.";

export type LocalUser = { id: string; email: string };
type LocalAccount = LocalUser & { passwordHash: string };
export type LocalAgent = {
  id: string;
  name: string;
  email: string;
  country_code: string;
  mobile: string;
  created_at: string;
};
export type LocalListItem = {
  id: string;
  agent_id: string;
  batch_id: string;
  first_name: string;
  phone: string;
  notes: string | null;
  created_at: string;
};
type StoredLocalAgent = LocalAgent & { password_hash: string };
type LocalWorkspace = { agents: StoredLocalAgent[]; items: LocalListItem[] };

function storage() {
  if (typeof window === "undefined")
    throw new Error("Local workspace is only available in a browser.");
  return window.localStorage;
}
function read<T>(key: string, fallback: T): T {
  const value = storage().getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  storage().setItem(key, JSON.stringify(value));
}
function workspaceKey(userId: string) {
  return `${WORKSPACE_PREFIX}${userId}`;
}
function getWorkspace(userId: string) {
  return read<LocalWorkspace>(workspaceKey(userId), { agents: [], items: [] });
}
function saveWorkspace(userId: string, workspace: LocalWorkspace) {
  write(workspaceKey(userId), workspace);
}
async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function hashPassword(password: string) {
  const salt = crypto.randomUUID();
  return `${salt}:${await digest(`${salt}:${password}`)}`;
}
async function passwordMatches(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");
  return Boolean(salt && expected && (await digest(`${salt}:${password}`)) === expected);
}
function currentUser() {
  const user = getLocalUser();
  if (!user) throw new Error("Your local session expired. Please sign in again.");
  return user;
}

export function getLocalUser() {
  return read<LocalUser | null>(SESSION_KEY, null);
}
export function isLocalWorkspace() {
  return Boolean(getLocalUser());
}
export async function signUpLocal(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = read<LocalAccount[]>(ACCOUNTS_KEY, []);
  if (accounts.some((account) => account.email === normalizedEmail))
    throw new Error("A local admin account with this email already exists.");
  const user = { id: crypto.randomUUID(), email: normalizedEmail };
  accounts.push({ ...user, passwordHash: await hashPassword(password) });
  write(ACCOUNTS_KEY, accounts);
  write(SESSION_KEY, user);
  saveWorkspace(user.id, { agents: [], items: [] });
  return user;
}
export async function signInLocal(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = read<LocalAccount[]>(ACCOUNTS_KEY, []);
  const account = accounts.find((candidate) => candidate.email === normalizedEmail);
  if (!account || !(await passwordMatches(password, account.passwordHash)))
    throw new Error("Invalid local email or password.");
  const user = { id: account.id, email: account.email };
  write(SESSION_KEY, user);
  return user;
}
export function signOutLocal() {
  storage().removeItem(SESSION_KEY);
}
function publicAgents(agents: StoredLocalAgent[]): LocalAgent[] {
  return agents.map(({ password_hash: _passwordHash, ...agent }) => agent);
}
export async function listLocalAgents() {
  return publicAgents(getWorkspace(currentUser().id).agents);
}
export async function createLocalAgent(input: unknown) {
  const user = currentUser();
  const data = agentSchema.parse(input);
  const workspace = getWorkspace(user.id);
  if (workspace.agents.some((agent) => agent.email === data.email.toLowerCase()))
    throw new Error("An agent with this email already exists.");
  const agent: StoredLocalAgent = {
    id: crypto.randomUUID(),
    name: data.name,
    email: data.email.toLowerCase(),
    country_code: data.countryCode,
    mobile: data.mobile,
    created_at: new Date().toISOString(),
    password_hash: await hashPassword(data.password),
  };
  workspace.agents.push(agent);
  saveWorkspace(user.id, workspace);
  return agent;
}
export async function deleteLocalAgent(id: string) {
  const user = currentUser();
  const workspace = getWorkspace(user.id);
  workspace.agents = workspace.agents.filter((agent) => agent.id !== id);
  workspace.items = workspace.items.filter((item) => item.agent_id !== id);
  saveWorkspace(user.id, workspace);
  return { ok: true };
}
export async function distributeLocalItems(items: ParsedItem[]) {
  const user = currentUser();
  const workspace = getWorkspace(user.id);
  const agents = workspace.agents.slice(0, REQUIRED_AGENT_COUNT);
  if (agents.length < REQUIRED_AGENT_COUNT)
    throw new Error(`Create ${REQUIRED_AGENT_COUNT} agents before distributing a list.`);
  const batchId = crypto.randomUUID();
  const now = new Date().toISOString();
  const agentIds = allocateAgentIds(
    agents.map((agent) => agent.id),
    items.length,
  );
  workspace.items.push(
    ...items.map((item, index) => ({
      id: crypto.randomUUID(),
      agent_id: agentIds[index],
      batch_id: batchId,
      first_name: item.firstName,
      phone: item.phone,
      notes: item.notes || null,
      created_at: now,
    })),
  );
  saveWorkspace(user.id, workspace);
  return { batchId, count: items.length, agentCount: REQUIRED_AGENT_COUNT };
}
export async function listLocalDistributedItems() {
  const workspace = getWorkspace(currentUser().id);
  return { agents: publicAgents(workspace.agents), items: workspace.items };
}
