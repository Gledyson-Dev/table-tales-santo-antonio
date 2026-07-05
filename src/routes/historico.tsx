import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { AppHeader } from "@/components/AppNav";
import { brl, csvDownload, dt } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/historico")({ component: HistoricoPage });

type Visit = {
  id: string;
  table_number: number;
  occupied_name: string | null;
  party_size: number | null;
  started_at: string;
  ended_at: string | null;
};
type Order = {
  id: string;
  table_number: number;
  status: string;
  total: number;
  closed_at: string | null;
  opened_at: string;
};

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const startOfMonth = (d = new Date()) => { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; };

function HistoricoPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"dia" | "mes" | "custom">("dia");
  const [from, setFrom] = useState(startOfMonth().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  async function load() {
    const since = startOfMonth().toISOString();
    const [v, o] = await Promise.all([
      supabase.from("table_visits").select("*").gte("started_at", since).order("started_at", { ascending: false }),
      supabase.from("orders").select("id, table_number, status, total, closed_at, opened_at").gte("opened_at", since).order("opened_at", { ascending: false }),
    ]);
    if (v.data) setVisits(v.data as Visit[]);
    if (o.data) setOrders(o.data as Order[]);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("hist-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_visits" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const range = useMemo(() => {
    if (tab === "dia") return { from: startOfDay().getTime(), to: Date.now() };
    if (tab === "mes") return { from: startOfMonth().getTime(), to: Date.now() };
    return { from: new Date(from + "T00:00:00").getTime(), to: new Date(to + "T23:59:59").getTime() };
  }, [tab, from, to]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return visits.filter((v) => {
      const t = new Date(v.started_at).getTime();
      if (t < range.from || t > range.to) return false;
      if (!term) return true;
      return (
        String(v.table_number).includes(term) ||
        (v.occupied_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [visits, range, q]);

  const filteredOrders = useMemo(
    () => orders.filter((o) => {
      const t = new Date(o.opened_at).getTime();
      return t >= range.from && t <= range.to;
    }),
    [orders, range],
  );

  const totals = useMemo(() => {
    const people = filtered.reduce((s, v) => s + (v.party_size ?? 0), 0);
    const revenue = filteredOrders.filter((o) => o.status === "closed").reduce((s, o) => s + Number(o.total ?? 0), 0);
    return { visits: filtered.length, people, revenue, tickets: filteredOrders.filter((o) => o.status === "closed").length };
  }, [filtered, filteredOrders]);

  // Charts data
  const byHour = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ h: `${h}h`, pessoas: 0, mesas: 0 }));
    filtered.forEach((v) => {
      const h = new Date(v.started_at).getHours();
      arr[h].pessoas += v.party_size ?? 0;
      arr[h].mesas += 1;
    });
    return arr;
  }, [filtered]);

  const topTables = useMemo(() => {
    const map = new Map<number, number>();
    filtered.forEach((v) => map.set(v.table_number, (map.get(v.table_number) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([number, count]) => ({ mesa: `Mesa ${number}`, atendimentos: count }));
  }, [filtered]);

  const byDay = useMemo(() => {
    const map = new Map<string, { pessoas: number; mesas: number }>();
    filtered.forEach((v) => {
      const k = new Date(v.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const cur = map.get(k) ?? { pessoas: 0, mesas: 0 };
      cur.pessoas += v.party_size ?? 0;
      cur.mesas += 1;
      map.set(k, cur);
    });
    return [...map.entries()].map(([dia, v]) => ({ dia, ...v })).reverse();
  }, [filtered]);

  function exportCsv() {
    csvDownload(`historico-${new Date().toISOString().slice(0,10)}.csv`, [
      ["Mesa", "Cliente", "Pessoas", "Início", "Fim", "Duração (min)"],
      ...filtered.map((v) => {
        const start = new Date(v.started_at);
        const end = v.ended_at ? new Date(v.ended_at) : null;
        const dur = end ? Math.round((end.getTime() - start.getTime()) / 60000) : "";
        return [v.table_number, v.occupied_name ?? "", v.party_size ?? "", dt(v.started_at), end ? dt(v.ended_at!) : "", dur];
      }),
    ]);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Histórico" subtitle="Atendimentos & Faturamento" />

      <main className="mx-auto max-w-6xl px-3 md:px-6 py-6 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="dia">Hoje</TabsTrigger>
              <TabsTrigger value="mes">Este mês</TabsTrigger>
              <TabsTrigger value="custom">Período</TabsTrigger>
            </TabsList>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </Button>
          </div>

          {tab === "custom" && (
            <div className="mt-3 flex flex-wrap gap-2 items-end">
              <div><label className="text-xs text-muted-foreground block">De</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground block">Até</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <Kpi label="Atendimentos" value={totals.visits} />
            <Kpi label="Pessoas" value={totals.people} />
            <Kpi label="Contas fechadas" value={totals.tickets} />
            <Kpi label="Faturamento" value={brl(totals.revenue)} />
          </div>

          <TabsContent value={tab} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard title="Movimento por hora">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byHour}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="h" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="pessoas" fill="var(--primary)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Mesas mais usadas">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topTables} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="mesa" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip />
                    <Bar dataKey="atendimentos" fill="var(--destructive)" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              {byDay.length > 1 && (
                <ChartCard title="Pessoas por dia" className="lg:col-span-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={byDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="pessoas" stroke="var(--primary)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por mesa ou nome..." value={q} onChange={(e) => setQ(e.target.value)} className="h-8" />
              </div>
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sem registros.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((v) => {
                    const start = new Date(v.started_at);
                    const end = v.ended_at ? new Date(v.ended_at) : null;
                    const dur = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;
                    return (
                      <li key={v.id} className="flex items-center gap-3 py-2">
                        <span className="font-serif text-xl text-primary w-10 text-center shrink-0">{v.table_number}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">
                            {v.occupied_name ?? "—"} · {v.party_size ?? "?"} pess.
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {dt(v.started_at)} {end ? `→ ${dt(v.ended_at!)}` : "· em curso"}
                            {dur !== null ? ` (${dur} min)` : ""}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-serif text-xl md:text-2xl">{value}</div>
    </div>
  );
}
function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-3 ${className}`}>
      <div className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">{title}</div>
      {children}
    </div>
  );
}
