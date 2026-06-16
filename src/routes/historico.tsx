import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/historico")({
  component: HistoricoPage,
});

type Visit = {
  id: string;
  table_number: number;
  occupied_name: string | null;
  party_size: number | null;
  started_at: string;
  ended_at: string | null;
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function HistoricoPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tab, setTab] = useState<"dia" | "mes">("dia");

  async function load() {
    const since = startOfMonth().toISOString();
    const { data, error } = await supabase
      .from("table_visits")
      .select("id, table_number, occupied_name, party_size, started_at, ended_at")
      .gte("started_at", since)
      .order("started_at", { ascending: false });
    if (!error) setVisits((data ?? []) as Visit[]);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("visits-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_visits" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const todayStart = startOfDay().getTime();
  const dayVisits = useMemo(
    () => visits.filter((v) => new Date(v.started_at).getTime() >= todayStart),
    [visits, todayStart]
  );

  const list = tab === "dia" ? dayVisits : visits;

  const totals = useMemo(() => {
    const people = list.reduce((s, v) => s + (v.party_size ?? 0), 0);
    return { count: list.length, people };
  }, [list]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-20 shadow">
        <div className="mx-auto max-w-4xl px-3 md:px-4 py-3 flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
          <h1 className="font-serif text-lg md:text-2xl">Histórico</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3 md:px-6 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "dia" | "mes")}>
          <TabsList>
            <TabsTrigger value="dia">Hoje</TabsTrigger>
            <TabsTrigger value="mes">Este mês</TabsTrigger>
          </TabsList>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-card px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Atendimentos</div>
              <div className="font-serif text-2xl">{totals.count}</div>
            </div>
            <div className="rounded-md border border-border bg-card px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pessoas</div>
              <div className="font-serif text-2xl">{totals.people}</div>
            </div>
          </div>

          <TabsContent value={tab} className="mt-4">
            {list.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Sem registros.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((v) => {
                  const start = new Date(v.started_at);
                  const end = v.ended_at ? new Date(v.ended_at) : null;
                  const dur = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;
                  return (
                    <li key={v.id} className="flex items-center justify-between gap-2 bg-card border border-border rounded-md px-3 py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-serif text-xl text-primary w-8 text-center shrink-0">{v.table_number}</span>
                        <div className="min-w-0">
                          <div className="text-sm truncate">
                            {v.occupied_name ?? "—"} · {v.party_size ?? "?"} pessoa{(v.party_size ?? 0) === 1 ? "" : "s"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {start.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            {end ? ` → ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : " · em curso"}
                            {dur !== null ? ` (${dur} min)` : ""}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
