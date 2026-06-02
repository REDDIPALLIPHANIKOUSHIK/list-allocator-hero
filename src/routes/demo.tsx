import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileSpreadsheet,
  ListChecks,
  LockKeyhole,
  Network,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Dashboard Preview | ListFlow" },
      { name: "description", content: "Preview the ListFlow lead allocation workspace." },
    ],
  }),
  component: DemoDashboard,
});

const agents = [
  ["Maya Patel", "maya@company.com", "+1 555 010 1001", "6"],
  ["Noah Williams", "noah@company.com", "+1 555 010 1002", "6"],
  ["Emma Garcia", "emma@company.com", "+1 555 010 1003", "5"],
  ["Liam Chen", "liam@company.com", "+1 555 010 1004", "5"],
  ["Olivia Martin", "olivia@company.com", "+1 555 010 1005", "5"],
];
const previewItems = [
  ["Avery", "+1 555 123 0001", "Requested a callback"],
  ["Morgan", "+1 555 123 0002", "Interested in premium plan"],
  ["Riley", "+1 555 123 0003", "Follow up on Friday"],
];

function DemoDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-primary p-2 text-primary-foreground">
              <Network className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-semibold tracking-tight">ListFlow</h1>
              <p className="text-xs text-muted-foreground">Lead allocation workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Read-only preview</Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Admin sign in</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto space-y-8 px-4 py-7 sm:py-9">
        <section className="overflow-hidden rounded-3xl border bg-[linear-gradient(120deg,oklch(0.28_0.10_260),oklch(0.20_0.07_260))] px-6 py-7 text-white shadow-xl sm:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                Dashboard preview
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Turn every upload into an organized workflow.
              </h2>
              <p className="text-sm leading-6 text-white/70 sm:text-base">
                Explore the complete five-agent allocation workspace. Sign in to create agents and
                distribute your own lists.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/75">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Secure admin workspace
            </div>
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat
            icon={Users}
            label="Team members"
            value="5"
            detail="5/5 distribution seats filled"
          />
          <Stat
            icon={ListChecks}
            label="Assigned records"
            value="27"
            detail="Across all uploaded lists"
          />
          <Stat
            icon={FileSpreadsheet}
            label="Upload batches"
            value="1"
            detail="Validated and distributed"
          />
        </section>
        <Tabs defaultValue="agents">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-muted p-1 sm:w-fit">
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="upload">Upload & distribute</TabsTrigger>
            <TabsTrigger value="lists">Assigned lists</TabsTrigger>
          </TabsList>
          <TabsContent value="agents" className="mt-6">
            <AgentPreview />
          </TabsContent>
          <TabsContent value="upload" className="mt-6">
            <UploadPreview />
          </TabsContent>
          <TabsContent value="lists" className="mt-6">
            <ListsPreview />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
function Stat({
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
function AgentPreview() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Your team</CardTitle>
        <CardDescription>The first five agents receive new list items in sequence.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map(([name, email, phone], index) => (
              <TableRow key={email}>
                <TableCell>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </TableCell>
                <TableCell>{phone}</TableCell>
                <TableCell>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Seat {index + 1}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
function UploadPreview() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Upload a customer list</CardTitle>
          <CardDescription>CSV and Excel rows are validated before distribution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] px-6 py-10 text-center">
            <FileSpreadsheet className="mx-auto mb-3 h-7 w-7 text-primary" />
            <p className="font-medium">Choose a spreadsheet to upload</p>
            <p className="mt-1 text-xs text-muted-foreground">
              .csv, .xlsx or .xls · Maximum 5 MB · Up to 10,000 rows
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="h-fit shadow-sm">
        <CardHeader>
          <CardTitle>Distribution readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Row text="5 of 5 agent seats filled" />
          <Row text="Spreadsheet uploaded and validated" muted />
        </CardContent>
      </Card>
    </div>
  );
}
function ListsPreview() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {agents.slice(0, 2).map(([name, email, , count], index) => (
        <Card key={email} className="shadow-sm">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{name}</CardTitle>
              <CardDescription>{email}</CardDescription>
            </div>
            <Badge variant="secondary">
              Seat {index + 1} · {count} items
            </Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewItems.map(([first, phone, note]) => (
                  <TableRow key={`${email}-${phone}`}>
                    <TableCell className="font-medium">{first}</TableCell>
                    <TableCell>{phone}</TableCell>
                    <TableCell className="text-muted-foreground">{note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
function Row({ text, muted = false }: { text: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`rounded-full p-1 ${muted ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-600"}`}
      >
        {muted ? <LockKeyhole className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      </span>
      {text}
    </div>
  );
}
