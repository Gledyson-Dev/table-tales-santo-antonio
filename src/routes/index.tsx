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

function Index() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [labels, setLabels] = useState<TextLabel[]>([]);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [partyInput, setPartyInput] = useState<string>("");
  const [seatFilter, setSeatFilter] = useState<"all" | number>("all");

  useEffect(() => {
    fetchTables().then(setTables).catch(console.error);
    fetchLabels().then(setLabels).catch(console.error);
    fetchSettings().then((s) => setBgUrl(s.bg_image_url)).catch(console.error);

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
      await supabase.from("tables").update({
        occupied: false, occupied_name: null, occupied_since: null,
      }).eq("id", t.id);
      // close the latest open visit for this table
      const { data: openVisits } = await supabase
        .from("table_visits")
        .select("id")
        .eq("table_id", t.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);
      const openId = openVisits?.[0]?.id;
      if (openId) {
        await supabase.from("table_visits")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", openId);
      }
    } else {
      setEditing(t);
      setNameInput("");
      setPartyInput(String(t.seats));
    }
  }

  async function confirmOccupy() {
    if (!editing) return;
    const party = Math.max(1, Number(partyInput) || 1);
    const now = new Date().toISOString();
    await supabase.from("tables").update({
      occupied: true,
      occupied_name: nameInput.trim() || null,
      occupied_since: now,
    }).eq("id", editing.id);
    await supabase.from("table_visits").insert({
      table_id: editing.id,
      table_number: editing.number,
      occupied_name: nameInput.trim() || null,
      party_size: party,
      started_at: now,
    });
    setEditing(null);
    setNameInput("");
    setPartyInput("");
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
            <div className="flex items-center gap-1.5 shrink-0">
              <Link to="/historico" className="px-2.5 py-1.5 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs">
                Histórico
              </Link>
              {authed ? (
                <Link to="/admin" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs">
                  <Settings className="h-3 w-3" /> Admin
                </Link>
              ) : (
                <Link to="/login" className="px-2.5 py-1.5 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs">
                  Entrar
                </Link>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <Stat label="Total" value={stats.total} />
            <Stat label="Livres" value={stats.livres} tone="success" />
            <Stat label="Ocup." value={stats.ocupadas} tone="destructive" />
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-5xl px-3 md:px-6 py-6">
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

        {stats.ocupadas > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl mb-3">Mesas ocupadas</h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {tables.filter((t) => t.occupied).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 bg-card border border-border rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-serif text-lg text-destructive">{t.number}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {t.occupied_name ?? "—"} · {t.seats} lug.
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
          <div className="space-y-2">
            <Label htmlFor="name">Nome do cliente (opcional)</Label>
            <Input id="name" value={nameInput} autoFocus
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ex: Família Silva"
              onKeyDown={(e) => e.key === "Enter" && confirmOccupy()} />
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
