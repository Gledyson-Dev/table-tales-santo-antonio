import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  component: Index,
});

const TABLE_NUMBERS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 20, 21, 23, 24, 25, 26,
  27, 28, 29, 30, 31, 32, 33, 34, 36, 40, 46, 51, 52, 53, 54, 55, 56, 57, 58,
  59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77,
  78, 79, 80, 81, 82,
];

type TableState = {
  occupied: boolean;
  name?: string;
  since?: number;
};

type StateMap = Record<number, TableState>;

const STORAGE_KEY = "santo-antonio-tables-v1";

function loadState(): StateMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function Index() {
  const [state, setState] = useState<StateMap>({});
  const [filter, setFilter] = useState<"todas" | "livres" | "ocupadas">("todas");
  const [editing, setEditing] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const stats = useMemo(() => {
    const ocupadas = TABLE_NUMBERS.filter((n) => state[n]?.occupied).length;
    return { total: TABLE_NUMBERS.length, ocupadas, livres: TABLE_NUMBERS.length - ocupadas };
  }, [state]);

  const visible = TABLE_NUMBERS.filter((n) => {
    const occ = !!state[n]?.occupied;
    if (filter === "livres") return !occ;
    if (filter === "ocupadas") return occ;
    return true;
  });

  function openTable(n: number) {
    const cur = state[n];
    if (cur?.occupied) {
      // free directly
      const next = { ...state };
      delete next[n];
      setState(next);
    } else {
      setEditing(n);
      setNameInput("");
    }
  }

  function confirmOccupy() {
    if (editing == null) return;
    setState((s) => ({
      ...s,
      [editing]: { occupied: true, name: nameInput.trim() || undefined, since: Date.now() },
    }));
    setEditing(null);
    setNameInput("");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl leading-tight">Santo Antônio</h1>
            <p className="text-xs md:text-sm opacity-80 tracking-widest uppercase mt-1">
              Gestão de Mesas · Plano de Chão
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <Stat label="Total" value={stats.total} />
            <Stat label="Livres" value={stats.livres} tone="success" />
            <Stat label="Ocupadas" value={stats.ocupadas} tone="destructive" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="font-serif text-2xl text-foreground">Mesas</h2>
          <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
            {(["todas", "livres", "ocupadas"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm capitalize transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {visible.map((n) => {
            const t = state[n];
            const occ = !!t?.occupied;
            return (
              <button
                key={n}
                onClick={() => openTable(n)}
                className={`group relative aspect-square rounded-lg border-2 p-2 flex flex-col items-center justify-center transition-all hover:scale-105 hover:shadow-md ${
                  occ
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary"
                }`}
              >
                <span className="font-serif text-2xl leading-none">{n}</span>
                <span className={`text-[10px] uppercase tracking-wider mt-1 ${occ ? "opacity-90" : "text-muted-foreground"}`}>
                  {occ ? "ocupada" : "livre"}
                </span>
                {occ && t?.name && (
                  <span className="text-[10px] mt-0.5 truncate max-w-full px-1 opacity-95">
                    {t.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          Toque numa mesa livre para ocupar · Toque numa ocupada para liberar
        </p>
      </main>

      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Ocupar mesa {editing}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="name">Nome do cliente (opcional)</Label>
            <Input
              id="name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ex: Família Silva"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && confirmOccupy()}
            />
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

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "destructive" }) {
  const dot =
    tone === "success" ? "bg-success" : tone === "destructive" ? "bg-destructive" : "bg-primary-foreground/50";
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary-foreground/10">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-xs uppercase tracking-wider opacity-80">{label}</span>
      <span className="font-serif text-xl">{value}</span>
    </div>
  );
}
