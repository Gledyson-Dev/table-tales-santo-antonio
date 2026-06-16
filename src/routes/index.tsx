import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fetchTables, fetchLabels, fetchSettings, type TableRow, type TextLabel } from "@/lib/floor-data";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Visit = {
  id: string;
  table_id: string | null;
  table_number: number;
  occupied_name: string | null;
  party_size: number | null;
  started_at: string;
  ended_at: string | null;
};

function Index() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [labels, setLabels] = useState<TextLabel[]>([]);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [partyInput, setPartyInput] = useState("");
  const [seatFilter, setSeatFilter] = useState<"all" | number>("all");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [view, setView] = useState<"mesas" | "historico">("mesas");

  async function loadVisits() {
    const since = new Date();
    since.setDate(since.getDate() - 35);
    const { data } = await supabase
      .from("table_visits")
      .select("*")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false });
    setVisits((data ?? []) as Visit[]);
  }

  useEffect(() => {
    fetchTables().then(setTables).catch(console.error);
    fetchLabels().then(setLabels).catch(console.error);
    fetchSettings().then((s) => setBgUrl(s.bg_image_url)).catch(console.error);
    loadVisits();

    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));

    const ch = supabase
      .channel("floor")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" },
        () => fetchTables().then(setTables))
      .on("postgres_changes", { event: "*", schema: "public", table: "text_labels" },
        () => fetchLabels().then(setLabels))
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" },
        () => fetchSettings().then((s) => setBgUrl(s.bg_image_url)))
      .on("postgres_changes", { event: "*", schema: "public", table: "table_visits" },
        () => loadVisits())
      .subscribe();

    return () => { sub.subscription.unsubscribe(); supabase.removeChannel(ch); };
  }, []);

  const seatGroups = useMemo(() => {
    const map = new Map<number, { total: number; livres: number }>();
    for (const t of tables) {
      const g = map.get(t.seats) ?? { total: 0, livres: 0 };
      g.total++;
      if (!t.occupied) g.livres++;
      map.set(t.seats, g);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [tables]);

  const stats = useMemo(() => {
    const ocupadas = tables.filter((t) => t.occupied).length;
    return { total: tables.length, ocupadas, livres: tables.length - ocupadas };
  }, [tables]);

  const visibleTables = seatFilter === "all"
    ? tables
    : tables.filter((t) => t.seats === seatFilter);

  async function handleClick(t: TableRow) {
    if (t.occupied) {
      // liberar: fechar visita aberta
      const { data: open } = await supabase
        .from("table_visits")
        .select("id")
        .eq("table_id", t.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);
      const openId = (open?.[0] as any)?.id;
      if (openId) {
        await supabase.from("table_visits").update({ ended_at: new Date().toISOString() }).eq("id", openId);
      }
      await supabase.from("tables").update({
        occupied: false, occupied_name: null, occupied_since: null, party_size: null,
      } as any).eq("id", t.id);
      loadVisits();
    } else {
      setEditing(t);
      setNameInput("");
      setPartyInput(String(t.seats));
    }
  }

  async function confirmOccupy() {
    if (!editing) return;
    const party = parseInt(partyInput, 10);
    const partySize = Number.isFinite(party) && party > 0 ? party : null;
    const now = new Date().toISOString();
    await supabase.from("tables").update({
      occupied: true,
      occupied_name: nameInput.trim() || null,
      occupied_since: now,
      party_size: partySize,
    } as any).eq("id", editing.id);
    await supabase.from("table_visits").insert({
      table_id: editing.id,
      table_number: editing.number,
      occupied_name: nameInput.trim() || null,
      party_size: partySize,
      started_at: now,
    } as any);
    setEditing(null);
    setNameInput("");
    setPartyInput("");
    loadVisits();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-20 shadow">
        <div className="mx-auto max-w-6xl px-3 md:px-4 py-3 md:py-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-serif text-xl md:text-3xl leading-tight truncate">Santo Antônio</h1>
              <p className="text-[9px] md:text-xs opacity-80 tracking-[0.2em] uppercase mt-0.5">
                Gestão de Mesas
              </p>
            </div>
            {authed ? (
              <Link to="/admin" className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs">
                <Settings className="h-3 w-3" /> Admin
              </Link>
            ) : (
              <Link to="/login" className="shrink-0 px-2.5 py-1.5 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs">
                Entrar
              </Link>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <Stat label="Total" value={stats.total} />
            <Stat label="Livres" value={stats.livres} tone="success" />
            <Stat label="Ocup." value={stats.ocupadas} tone="destructive" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 md:px-6 py-6">
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="mb-4">
          <TabsList>
            <TabsTrigger value="mesas">Mesas</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === "mesas" ? (
          <Tabs value={String(seatFilter)} onValueChange={(v) =>
            setSeatFilter(v === "all" ? "all" : Number(v))
          }>
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="all">Todas ({tables.length})</TabsTrigger>
              {seatGroups.map(([seats, g]) => (
                <TabsTrigger key={seats} value={String(seats)}>
                  {seats} lug. ({g.livres}/{g.total})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={String(seatFilter)} className="mt-4">
              <div className="mb-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <LegendDot className="bg-card border border-border" /> Livre
                <LegendDot className="bg-destructive" /> Ocupada
              </div>

              <div
                className="relative mx-auto rounded-lg overflow-hidden border border-border bg-card bg-center bg-no-repeat bg-contain"
                style={{
                  aspectRatio: "1357 / 1920",
                  maxWidth: "780px",
                  backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
                }}
              >
                {labels.map((l) => (
                  <div
                    key={l.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 font-serif font-semibold text-muted-foreground pointer-events-none whitespace-nowrap"
                    style={{ left: `${l.x}%`, top: `${l.y}%`, fontSize: `${l.font_size}px` }}
                  >
                    {l.text}
                  </div>
                ))}
                {visibleTables.map((t) => (
                  <TableMarker key={t.id} t={t} onClick={() => handleClick(t)} dim={seatFilter !== "all"} />
                ))}
                {seatFilter !== "all" && tables.filter((t) => t.seats !== seatFilter).map((t) => (
                  <TableMarker key={t.id + "-faded"} t={t} onClick={() => handleClick(t)} faded />
                ))}
              </div>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Toque numa mesa para ocupar/liberar
              </p>
            </TabsContent>
          </Tabs>
        ) : (
          <HistoryView visits={visits} />
        )}

        {view === "mesas" && stats.ocupadas > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl mb-3">Mesas ocupadas</h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {tables.filter((t) => t.occupied).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 bg-card border border-border rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-serif text-lg text-destructive">{t.number}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {t.occupied_name ?? "—"} · {(t as any).party_size ?? "?"} pess.
                    </span>
                  </div>
                  <button onClick={() => handleClick(t)} className="text-[10px] uppercase tracking-wider text-primary hover:underline">
                    Liberar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Ocupar mesa {editing?.number} ({editing?.seats} lugares)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do cliente (opcional)</Label>
              <Input id="name" value={nameInput} autoFocus
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex: Família Silva" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party">Quantas pessoas?</Label>
              <Input id="party" type="number" min={1} value={partyInput}
                onChange={(e) => setPartyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmOccupy()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={confirmOccupy}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryView({ visits }: { visits: Visit[] }) {
  const [period, setPeriod] = useState<"dia" | "mes">("dia");

  const filtered = useMemo(() => {
    const now = new Date();
    if (period === "dia") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return visits.filter((v) => new Date(v.started_at) >= start);
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return visits.filter((v) => new Date(v.started_at) >= start);
  }, [visits, period]);

  const totalPessoas = filtered.reduce((sum, v) => sum + (v.party_size ?? 0), 0);
  const totalVisitas = filtered.length;

  return (
    <div className="space-y-4">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
        <TabsList>
          <TabsTrigger value="dia">Hoje</TabsTrigger>
          <TabsTrigger value="mes">Este mês</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border border-border rounded-md px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Visitas</div>
          <div className="font-serif text-3xl">{totalVisitas}</div>
        </div>
        <div className="bg-card border border-border rounded-md px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pessoas</div>
          <div className="font-serif text-3xl">{totalPessoas}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_60px_90px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <span>Mesa</span><span>Cliente</span><span className="text-center">Pess.</span><span className="text-right">Início</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Sem registros.</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((v) => (
              <li key={v.id} className="grid grid-cols-[40px_1fr_60px_90px] gap-2 px-3 py-2 text-sm items-center">
                <span className="font-serif text-base">{v.table_number}</span>
                <span className="truncate">{v.occupied_name ?? "—"}</span>
                <span className="text-center">{v.party_size ?? "—"}</span>
                <span className="text-right text-xs text-muted-foreground">
                  {new Date(v.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TableMarker({ t, onClick, faded, dim }: {
  t: TableRow; onClick: () => void; faded?: boolean; dim?: boolean;
}) {
  const isCircle = t.shape === "circle";
  return (
    <button
      onClick={onClick}
      title={`Mesa ${t.number} · ${t.seats} lugares${t.occupied ? ` · ${t.occupied_name ?? "Ocupada"}` : ""}`}
      className={`absolute -translate-x-1/2 -translate-y-1/2 font-serif text-[10px] md:text-xs font-semibold flex flex-col items-center justify-center leading-none transition-all hover:scale-110 hover:z-10 ${
        isCircle ? "rounded-full" : "rounded-sm"
      } ${
        t.occupied
          ? "bg-destructive text-destructive-foreground border-2 border-destructive"
          : "bg-card text-primary border-2 border-primary/60 hover:bg-primary/10"
      } ${faded ? "opacity-25" : dim ? "" : ""}`}
      style={{ left: `${t.x}%`, top: `${t.y}%`, width: `${t.w}%`, height: `${t.h}%` }}
    >
      <span>{t.number}</span>
      <span className="text-[8px] opacity-70">{t.seats}p</span>
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "destructive" }) {
  const dot = tone === "success" ? "bg-success" : tone === "destructive" ? "bg-destructive" : "bg-primary-foreground/50";
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary-foreground/10 text-left">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="uppercase tracking-wider opacity-80">{label}</span>
      <span className="font-serif text-base leading-none">{value}</span>
    </div>
  );
}

function LegendDot({ className }: { className: string }) {
  return <span className={`inline-block h-3 w-3 rounded-sm ${className}`} />;
}
