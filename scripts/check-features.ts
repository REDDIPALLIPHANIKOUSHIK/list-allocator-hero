import * as XLSX from "xlsx";
import { agentSchema, hashAgentPassword } from "../src/lib/agent-credentials";
import { allocateAgentIds } from "../src/lib/allocation";
import { parseFile } from "../src/lib/csv-parser";
import {
  createLocalAgent,
  distributeLocalItems,
  getLocalUser,
  listLocalAgents,
  listLocalDistributedItems,
  signInLocal,
  signOutLocal,
  signUpLocal,
} from "../src/lib/local-workspace";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectFailure(label: string, action: () => Promise<unknown>, expected: string) {
  try {
    await action();
    throw new Error(`${label}: expected failure`);
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(expected),
      `${label}: unexpected error`,
    );
  }
}

const validAgent = agentSchema.parse({
  name: "Maya Patel",
  email: "maya@example.com",
  countryCode: "+1",
  mobile: "5551234567",
  password: "AgentPass1",
});
assert(validAgent.email === "maya@example.com", "Valid agent schema check failed");
assert(
  !agentSchema.safeParse({ ...validAgent, password: "weak" }).success,
  "Weak agent password should fail validation",
);
const firstHash = await hashAgentPassword(validAgent.password);
const secondHash = await hashAgentPassword(validAgent.password);
assert(firstHash !== secondHash, "Agent password hashes must use independent salts");
assert(
  !firstHash.includes(validAgent.password) && firstHash.split(":").length === 2,
  "Agent password hash format is invalid",
);

const csv = new File(
  ["FirstName,Phone,Notes\nAvery,+15551230001,Requested a callback\nMorgan,+15551230002,\n"],
  "leads.csv",
);
const parsedCsv = await parseFile(csv);
assert(parsedCsv.length === 2 && parsedCsv[0].firstName === "Avery", "CSV parsing failed");

for (const extension of ["xlsx", "xls"]) {
  const worksheet = XLSX.utils.json_to_sheet([
    { FirstName: "Riley", Phone: "+15551230003", Notes: "VIP" },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
  const bytes = XLSX.write(workbook, { bookType: extension as "xlsx" | "xls", type: "array" });
  const rows = await parseFile(new File([bytes], `leads.${extension}`));
  assert(rows.length === 1 && rows[0].notes === "VIP", `${extension.toUpperCase()} parsing failed`);
}

await expectFailure(
  "missing phone",
  () => parseFile(new File(["FirstName,Phone,Notes\nAvery,,Callback\n"], "bad.csv")),
  "Phone is required",
);
await expectFailure(
  "missing notes header",
  () => parseFile(new File(["FirstName,Phone\nAvery,+15551230001\n"], "bad.csv")),
  "must contain FirstName, Phone, and Notes",
);
await expectFailure(
  "wrong extension",
  () => parseFile(new File(["test"], "bad.txt")),
  "Only .csv, .xlsx, and .xls",
);
await expectFailure(
  "oversized file",
  () => parseFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "huge.csv")),
  "cannot exceed 5 MB",
);

const agents = ["a1", "a2", "a3", "a4", "a5"];
const assignments = allocateAgentIds(agents, 27);
assert(assignments.length === 27, "Allocation item count is incorrect");
assert(
  agents.map((id) => assignments.filter((assigned) => assigned === id).length).join(",") ===
    "6,6,5,5,5",
  "Remainder allocation is incorrect",
);
try {
  allocateAgentIds(agents.slice(0, 4), 10);
  throw new Error("Four-agent allocation should fail");
} catch (error) {
  assert(
    error instanceof Error && error.message.includes("Exactly 5 agents"),
    "Agent-count guard failed",
  );
}

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    },
  },
});
await signUpLocal("admin@example.com", "AdminPass1");
assert(getLocalUser()?.email === "admin@example.com", "Local signup did not create a session");
for (let index = 1; index <= 5; index += 1) {
  await createLocalAgent({
    name: `Agent ${index}`,
    email: `agent${index}@example.com`,
    countryCode: "+1",
    mobile: `555123456${index}`,
    password: "AgentPass1",
  });
}
const localAgents = await listLocalAgents();
assert(localAgents.length === 5, "Local agent creation failed");
assert(!("password_hash" in localAgents[0]), "Local agent hash leaked into browser response");
await distributeLocalItems(
  Array.from({ length: 7 }, (_, index) => ({
    firstName: `Lead ${index + 1}`,
    phone: `+1555000000${index}`,
    notes: "",
  })),
);
const localLists = await listLocalDistributedItems();
assert(localLists.items.length === 7, "Local list distribution failed");
assert(
  localLists.agents
    .map((agent) => localLists.items.filter((item) => item.agent_id === agent.id).length)
    .join(",") === "2,2,1,1,1",
  "Local remainder distribution failed",
);
signOutLocal();
assert(!getLocalUser(), "Local logout failed");
await signInLocal("admin@example.com", "AdminPass1");
assert(getLocalUser()?.email === "admin@example.com", "Local login failed");
assert((await listLocalAgents()).length === 5, "Local workspace was not preserved after login");
assert(
  (await listLocalDistributedItems()).items.length === 7,
  "Local assignments were not preserved after login",
);

console.log(
  "Feature checks passed: local auth/workspace, agent credentials, CSV/XLSX/XLS validation, and five-agent allocation.",
);
