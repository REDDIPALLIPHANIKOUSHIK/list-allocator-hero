import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  ListChecks,
  LockKeyhole,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createAgent, deleteAgent, listAgents } from "@/lib/agents.functions";
import { parseFile, type ParsedItem } from "@/lib/csv-parser";
import { distributeItems, listDistributedItems } from "@/lib/lists.functions";
import {
  createLocalAgent,
  deleteLocalAgent,
  distributeLocalItems,
  isLocalWorkspace,
  listLocalAgents,
  listLocalDistributedItems,
} from "@/lib/local-workspace";

const REQUIRED_AGENT_COUNT = 5;

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | ListFlow" },
      { name: "description", content: "Manage agents and distribute customer lists." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const listFn = useServerFn(listAgents);
  const listsFn = useServerFn(listDistributedItems);
  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => (isLocalWorkspace() ? listLocalAgents() : listFn()),
  });
  const { data: lists } = useQuery({
    queryKey: ["lists"],
    queryFn: () => (isLocalWorkspace() ? listLocalDistributedItems() : listsFn()),
  });
  const assignedCount = lists?.items.length ?? 0;
  const batchCount = new Set(lists?.items.map((item) => item.batch_id)).size;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-[linear-gradient(120deg,oklch(0.28_0.10_260),oklch(0.20_0.07_260))] px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
              Operations dashboard
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Turn every upload into an organized workflow.
            </h2>
            <p className="text-sm leading-6 text-white/70 sm:text-base">
              Create your five-agent team, validate each spreadsheet, and share leads evenly in
              seconds.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/75">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Secure admin workspace
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Team members"
          value={`${agents.length}`}
          detail={`${Math.min(agents.length, REQUIRED_AGENT_COUNT)}/${REQUIRED_AGENT_COUNT} distribution seats filled`}
        />
        <StatCard
          icon={ListChecks}
          label="Assigned records"
          value={`${assignedCount}`}
          detail="Across all uploaded lists"
        />
        <StatCard
          icon={FileSpreadsheet}
          label="Upload batches"
          value={`${batchCount}`}
          detail="Validated and distributed"
        />
      </section>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-muted p-1 sm:w-fit">
          <TabsTrigger value="agents" className="gap-2 px-4 py-2.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Agents</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2 px-4 py-2.5">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload & distribute</span>
          </TabsTrigger>
          <TabsTrigger value="lists" className="gap-2 px-4 py-2.5">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Assigned lists</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="agents" className="mt-6">
          <AgentsPanel />
        </TabsContent>
        <TabsContent value="upload" className="mt-6">
          <UploadPanel />
        </TabsContent>
        <TabsContent value="lists" className="mt-6">
          <ListsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentsPanel() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listAgents);
  const createFn = useServerFn(createAgent);
  const deleteFn = useServerFn(deleteAgent);
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => (isLocalWorkspace() ? listLocalAgents() : listFn()),
  });
  const [form, setForm] = useState({
    name: "",
    email: "",
    countryCode: "+1",
    mobile: "",
    password: "",
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["agents"] });
    queryClient.invalidateQueries({ queryKey: ["lists"] });
  };
  const createMutation = useMutation({
    mutationFn: () => (isLocalWorkspace() ? createLocalAgent(form) : createFn({ data: form })),
    onSuccess: () => {
      toast.success("Agent account created");
      setForm({ name: "", email: "", countryCode: "+1", mobile: "", password: "" });
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      isLocalWorkspace() ? deleteLocalAgent(id) : deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Agent removed");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: event.target.value });

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit shadow-sm">
        <CardHeader>
          <CardTitle>Add an agent</CardTitle>
          <CardDescription>Create a secure team account for list assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <FormField label="Full name" id="name">
              <Input
                id="name"
                value={form.name}
                onChange={update("name")}
                placeholder="e.g. Maya Patel"
                required
              />
            </FormField>
            <FormField label="Email address" id="email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="maya@company.com"
                required
              />
            </FormField>
            <div className="grid grid-cols-[86px_1fr] gap-2">
              <FormField label="Code" id="code">
                <Input
                  id="code"
                  value={form.countryCode}
                  onChange={update("countryCode")}
                  required
                />
              </FormField>
              <FormField label="Mobile number" id="mobile">
                <Input
                  id="mobile"
                  inputMode="numeric"
                  value={form.mobile}
                  onChange={update("mobile")}
                  placeholder="5551234567"
                  required
                />
              </FormField>
            </div>
            <FormField label="Temporary password" id="agent-password">
              <Input
                id="agent-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={update("password")}
                placeholder="8+ chars, letter & number"
                required
              />
            </FormField>
            <Button className="w-full" disabled={createMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Creating..." : "Create agent"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Your team</CardTitle>
            <CardDescription className="mt-1">
              The first five agents receive new list items in sequence.
            </CardDescription>
          </div>
          <Badge variant={agents.length >= REQUIRED_AGENT_COUNT ? "default" : "secondary"}>
            {Math.min(agents.length, REQUIRED_AGENT_COUNT)}/{REQUIRED_AGENT_COUNT} ready
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <EmptyMessage>Loading agents...</EmptyMessage>
          ) : agents.length === 0 ? (
            <EmptyMessage>Add your first team member to begin.</EmptyMessage>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent, index) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.email}</p>
                    </TableCell>
                    <TableCell>
                      {agent.country_code} {agent.mobile}
                    </TableCell>
                    <TableCell>
                      {index < REQUIRED_AGENT_COUNT ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Seat {index + 1}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Standby</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${agent.name}`}
                        onClick={() => deleteMutation.mutate(agent.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UploadPanel() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listAgents);
  const distributeFn = useServerFn(distributeItems);
  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => (isLocalWorkspace() ? listLocalAgents() : listFn()),
  });
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const ready = agents.length >= REQUIRED_AGENT_COUNT;

  const mutation = useMutation({
    mutationFn: (items: ParsedItem[]) =>
      isLocalWorkspace() ? distributeLocalItems(items) : distributeFn({ data: { items } }),
    onSuccess: (result) => {
      toast.success(`Distributed ${result.count} items equally across ${result.agentCount} agents`);
      setParsed(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const items = await parseFile(file);
      setParsed(items);
      setFileName(file.name);
      toast.success(`${items.length} valid rows are ready`);
    } catch (error) {
      setParsed(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      toast.error(error instanceof Error ? error.message : "Could not read that file");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Upload a customer list</CardTitle>
          <CardDescription>
            Use a CSV or Excel file with FirstName, Phone, and Notes columns. Every row is validated
            before distribution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] px-6 py-10 text-center transition hover:bg-primary/[0.06]"
            htmlFor="list-file"
          >
            <span className="mb-3 rounded-full bg-primary/10 p-3 text-primary">
              <Upload className="h-6 w-6" />
            </span>
            <span className="font-medium">Choose a spreadsheet to upload</span>
            <span className="mt-1 text-xs text-muted-foreground">
              .csv, .xlsx or .xls · Maximum 5 MB · Up to 10,000 rows
            </span>
          </label>
          <Input
            id="list-file"
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={onFile}
            className="sr-only"
          />
          {parsed && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 p-4">
                <div>
                  <p className="font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsed.length} valid records ready to assign
                  </p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Validated
                </Badge>
              </div>
              <div className="max-h-72 overflow-auto rounded-xl border">
                <PreviewTable items={parsed} />
              </div>
              <Button
                disabled={!ready || mutation.isPending}
                onClick={() => mutation.mutate(parsed)}
              >
                {mutation.isPending ? "Distributing..." : "Distribute list"}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="h-fit shadow-sm">
        <CardHeader>
          <CardTitle>Distribution readiness</CardTitle>
          <CardDescription>Complete these checks before sharing a list.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ReadinessRow
            done={ready}
            text={`${Math.min(agents.length, REQUIRED_AGENT_COUNT)} of ${REQUIRED_AGENT_COUNT} agent seats filled`}
          />
          <ReadinessRow
            done={Boolean(parsed)}
            text={
              parsed
                ? `${parsed.length} spreadsheet rows validated`
                : "Spreadsheet uploaded and validated"
            }
          />
          <p className="rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
            Records are assigned round-robin. If the total cannot be divided evenly by five, the
            first agents receive one additional record in sequence.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ListsPanel() {
  const fn = useServerFn(listDistributedItems);
  const { data, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: () => (isLocalWorkspace() ? listLocalDistributedItems() : fn()),
  });
  if (isLoading) return <EmptyMessage>Loading assigned lists...</EmptyMessage>;
  if (!data?.agents.length)
    return <EmptyMessage>Add five agents and upload a list to see assignments.</EmptyMessage>;
  const activeAgents = data.agents.slice(0, REQUIRED_AGENT_COUNT);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {activeAgents.map((agent, index) => {
        const items = data.items.filter((item) => item.agent_id === agent.id);
        return (
          <Card key={agent.id} className="shadow-sm">
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>{agent.name}</CardTitle>
                <CardDescription className="mt-1">
                  {agent.email} · {agent.country_code} {agent.mobile}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                Seat {index + 1} · {items.length} items
              </Badge>
            </CardHeader>
            <CardContent>
              {items.length ? (
                <div className="max-h-80 overflow-auto rounded-xl border">
                  <AssignedTable items={items} />
                </div>
              ) : (
                <EmptyMessage>No items assigned yet.</EmptyMessage>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PreviewTable({ items }: { items: ParsedItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>First name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.slice(0, 50).map((item, index) => (
          <TableRow key={`${item.phone}-${index}`}>
            <TableCell className="font-medium">{item.firstName}</TableCell>
            <TableCell>{item.phone}</TableCell>
            <TableCell className="text-muted-foreground">{item.notes || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
function AssignedTable({
  items,
}: {
  items: { id: string; first_name: string; phone: string; notes: string | null }[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>First name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.first_name}</TableCell>
            <TableCell>{item.phone}</TableCell>
            <TableCell className="text-muted-foreground">{item.notes || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
function FormField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
function ReadinessRow({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`rounded-full p-1 ${done ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"}`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
      </span>
      <span>{text}</span>
    </div>
  );
}
function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
