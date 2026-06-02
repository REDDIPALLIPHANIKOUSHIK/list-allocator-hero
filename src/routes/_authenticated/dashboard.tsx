import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, Upload, ListChecks, Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { createAgent, deleteAgent, listAgents } from "@/lib/agents.functions";
import { distributeItems, listDistributedItems } from "@/lib/lists.functions";
import { parseFile, type ParsedItem } from "@/lib/csv-parser";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Agent Manager" },
      { name: "description", content: "Manage agents and distribute CSV lists." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <Tabs defaultValue="agents" className="w-full">
      <TabsList className="grid w-full max-w-xl grid-cols-3">
        <TabsTrigger value="agents"><Users className="h-4 w-4 mr-2" />Agents</TabsTrigger>
        <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2" />Upload & Distribute</TabsTrigger>
        <TabsTrigger value="lists"><ListChecks className="h-4 w-4 mr-2" />Distributed Lists</TabsTrigger>
      </TabsList>
      <TabsContent value="agents" className="mt-6"><AgentsPanel /></TabsContent>
      <TabsContent value="upload" className="mt-6"><UploadPanel /></TabsContent>
      <TabsContent value="lists" className="mt-6"><ListsPanel /></TabsContent>
    </Tabs>
  );
}

function AgentsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAgents);
  const createFn = useServerFn(createAgent);
  const deleteFn = useServerFn(deleteAgent);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => listFn(),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const createM = useMutation({
    mutationFn: (input: { name: string; email: string; countryCode: string; mobile: string; password: string }) =>
      createFn({ data: input }),
    onSuccess: () => {
      toast.success("Agent added");
      setName(""); setEmail(""); setMobile(""); setPassword(""); setCountryCode("+91");
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Agent removed");
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createM.mutate({ name, email, countryCode, mobile, password });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle><h2 className="text-lg font-semibold">Add Agent</h2></CardTitle>
          <CardDescription>Create a new agent account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <div className="space-y-1"><Label>Code</Label><Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="+91" required /></div>
              <div className="space-y-1"><Label>Mobile</Label><Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" required /></div>
            </div>
            <div className="space-y-1"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full" disabled={createM.isPending}>
              <Plus className="h-4 w-4 mr-2" />{createM.isPending ? "Adding..." : "Add Agent"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h2 className="text-lg font-semibold">Agents ({agents.length})</h2></CardTitle>
          <CardDescription>Lists are distributed among the first 5 agents (in creation order).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents yet. Add your first agent.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.name}
                      {i < 5 && <Badge variant="secondary" className="ml-2">#{i + 1}</Badge>}
                    </TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>{a.country_code} {a.mobile}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteM.mutate(a.id)}>
                        <Trash2 className="h-4 w-4" />
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
  const qc = useQueryClient();
  const distributeFn = useServerFn(distributeItems);
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const distM = useMutation({
    mutationFn: (items: ParsedItem[]) => distributeFn({ data: { items } }),
    onSuccess: (res) => {
      toast.success(`Distributed ${res.count} items across ${res.agentCount} agent(s)`);
      setParsed(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const items = await parseFile(f);
      setParsed(items);
      setFileName(f.name);
      toast.success(`Parsed ${items.length} rows from ${f.name}`);
    } catch (err) {
      setParsed(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle><h2 className="text-lg font-semibold">Upload CSV / Excel</h2></CardTitle>
        <CardDescription>
          Accepted: <code>.csv, .xlsx, .xls</code>. Required columns: <strong>FirstName</strong>, <strong>Phone</strong>. Optional: <strong>Notes</strong>.
          Items are distributed equally among the first 5 agents (extras go round-robin).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">File</Label>
          <Input id="file" ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} />
        </div>

        {parsed && (
          <div className="space-y-3">
            <div className="rounded-md border p-3 text-sm">
              <p><strong>{fileName}</strong> — {parsed.length} valid rows ready to distribute.</p>
            </div>
            <div className="rounded-md border max-h-72 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FirstName</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.firstName}</TableCell>
                      <TableCell>{r.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{r.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsed.length > 50 && (
                <p className="p-2 text-xs text-muted-foreground">Showing first 50 of {parsed.length} rows.</p>
              )}
            </div>
            <Button onClick={() => distM.mutate(parsed)} disabled={distM.isPending}>
              {distM.isPending ? "Distributing..." : "Distribute to Agents"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListsPanel() {
  const fn = useServerFn(listDistributedItems);
  const { data, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: () => fn(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data || data.agents.length === 0) {
    return <p className="text-sm text-muted-foreground">Add agents and upload a list to see distributions.</p>;
  }

  const itemsByAgent = new Map<string, typeof data.items>();
  for (const a of data.agents) itemsByAgent.set(a.id, []);
  for (const it of data.items) {
    const arr = itemsByAgent.get(it.agent_id);
    if (arr) arr.push(it);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.agents.map((a) => {
        const items = itemsByAgent.get(a.id) ?? [];
        return (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle><h3 className="text-base font-semibold">{a.name}</h3></CardTitle>
              <CardDescription>{a.email} · {items.length} item(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items assigned.</p>
              ) : (
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="font-medium">{it.first_name}</TableCell>
                          <TableCell>{it.phone}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{it.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}