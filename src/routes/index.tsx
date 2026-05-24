import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import floorPlan from "@/assets/floor-plan.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

// Posições aproximadas (x%, y%) de cada mesa sobre a imagem do plano de chão.
const TABLES: { n: number; x: number; y: number }[] = [
  // Salão superior (Adega)
  { n: 30, x: 26, y: 6.5 },
  { n: 40, x: 35, y: 8.5 },
  { n: 20, x: 46, y: 7 },
  { n: 31, x: 22, y: 14 },
  { n: 29, x: 32, y: 14 },
  { n: 24, x: 40, y: 14 },
  { n: 21, x: 48, y: 16 },
  { n: 32, x: 22, y: 19.5 },
  { n: 28, x: 32, y: 19.5 },
  { n: 25, x: 41, y: 19.5 },
  { n: 23, x: 48, y: 22 },
  { n: 33, x: 22, y: 25 },
  { n: 46, x: 31, y: 25 },
  { n: 36, x: 38, y: 25 },
  { n: 26, x: 44, y: 25 },
  { n: 34, x: 22, y: 30.5 },
  { n: 27, x: 30, y: 30.5 },

  // Coluna central do restaurante
  { n: 14, x: 42, y: 36.5 },
  { n: 75, x: 50, y: 36.5 },
  { n: 12, x: 42, y: 41 },
  { n: 73, x: 50, y: 41 },
  { n: 74, x: 57, y: 41 },
  { n: 11, x: 42, y: 45.5 },
  { n: 71, x: 50, y: 45.5 },
  { n: 72, x: 57, y: 45.5 },
  { n: 16, x: 36, y: 49 },
  { n: 10, x: 42, y: 50 },
  { n: 69, x: 50, y: 50 },
  { n: 70, x: 57, y: 50 },
  { n: 15, x: 36, y: 54 },
  { n: 9, x: 42, y: 55 },
  { n: 67, x: 50, y: 55 },
  { n: 68, x: 57, y: 55 },
  { n: 8, x: 42, y: 60.5 },
  { n: 52, x: 52, y: 62.5 },

  // Coluna direita superior
  { n: 76, x: 67, y: 33 },
  { n: 78, x: 74, y: 33 },
  { n: 77, x: 67, y: 36 },
  { n: 79, x: 74, y: 36 },
  { n: 80, x: 68, y: 44 },
  { n: 81, x: 75, y: 44 },
  { n: 82, x: 69, y: 49.5 },

  // Coluna direita / sala 2
  { n: 53, x: 72, y: 62 },
  { n: 54, x: 72, y: 67 },
  { n: 7, x: 31, y: 65.5 },
  { n: 6, x: 32, y: 70.5 },

  // Salão inferior
  { n: 5, x: 39, y: 75.5 },
  { n: 63, x: 50, y: 75.5 },
  { n: 64, x: 59, y: 75.5 },
  { n: 55, x: 69, y: 75.5 },
  { n: 4, x: 39, y: 79.5 },
  { n: 62, x: 50, y: 79.5 },
  { n: 65, x: 59, y: 79.5 },
  { n: 56, x: 69, y: 79.5 },
  { n: 3, x: 39, y: 84 },
  { n: 66, x: 59, y: 84 },
  { n: 57, x: 69, y: 84 },
  { n: 61, x: 50, y: 85 },
  { n: 2, x: 39, y: 89 },
  { n: 60, x: 53, y: 91.5 },
  { n: 58, x: 69, y: 91 },
  { n: 1, x: 39, y: 94 },
  { n: 59, x: 69, y: 95 },
];

type TableState = { occupied: boolean; name?: string; since?: number };
type StateMap = Record<number, TableState>;

const STORAGE_KEY = "santo-antonio-tables-v2";

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
    const ocupadas = TABLES.filter((t) => state[t.n]?.occupied).length;
    return {
      total: TABLES.length,
      ocupadas,
      livres: TABLES.length - ocupadas,
    };
  }, [state]);

  function handleClick(n: number) {
    const cur = state[n];
    if (cur?.occupied) {
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
      [editing]: {
        occupied: true,
        name: nameInput.trim() || undefined,
        since: Date.now(),
      },
    }));
    setEditing(null);
    setNameInput("");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-20 shadow">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl leading-tight">
              Santo Antônio
            </h1>
            <p className="text-[10px] md:text-xs opacity-80 tracking-[0.2em] uppercase mt-0.5">
              Plano de Chão · Gestão de Mesas
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <Stat label="Total" value={stats.total} />
            <Stat label="Livres" value={stats.livres} tone="success" />
            <Stat label="Ocup." value={stats.ocupadas} tone="destructive" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 md:px-6 py-6">
        <div className="mb-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <LegendDot className="bg-card border border-border" /> Livre
          <LegendDot className="bg-primary" /> Ocupada
        </div>

        <div
          className="relative mx-auto rounded-lg overflow-hidden shadow-lg border border-border bg-card"
          style={{ aspectRatio: "884 / 1148", maxWidth: "780px" }}
        >
          <img
            src={floorPlan}
            alt="Plano de chão Santo Antônio"
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />
          <div className="absolute inset-0">
            {TABLES.map((t) => {
              const st = state[t.n];
              const occ = !!st?.occupied;
              return (
                <button
                  key={t.n}
                  onClick={() => handleClick(t.n)}
                  title={
                    occ
                      ? `Mesa ${t.n} — ${st?.name ?? "Ocupada"} (toque para liberar)`
                      : `Mesa ${t.n} — Livre`
                  }
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full font-serif text-[10px] md:text-xs flex items-center justify-center transition-all hover:scale-125 hover:z-10 shadow-sm ${
                    occ
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/40 animate-[pulse_2s_ease-in-out_infinite]"
                      : "bg-card text-foreground border border-primary/40 hover:border-primary"
                  }`}
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    width: "28px",
                    height: "28px",
                  }}
                >
                  {t.n}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Toque numa mesa livre para ocupar · numa ocupada para liberar
        </p>

        {/* Lista de mesas ocupadas */}
        {stats.ocupadas > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl mb-3 text-foreground">
              Mesas ocupadas
            </h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TABLES.filter((t) => state[t.n]?.occupied).map((t) => {
                const st = state[t.n]!;
                return (
                  <li
                    key={t.n}
                    className="flex items-center justify-between gap-2 bg-card border border-border rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-serif text-lg text-primary">
                        {t.n}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {st.name ?? "—"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleClick(t.n)}
                      className="text-[10px] uppercase tracking-wider text-primary hover:underline"
                    >
                      Liberar
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      <Dialog
        open={editing != null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Ocupar mesa {editing}
            </DialogTitle>
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
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmOccupy}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive";
}) {
  const dot =
    tone === "success"
      ? "bg-success"
      : tone === "destructive"
        ? "bg-destructive"
        : "bg-primary-foreground/50";
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary-foreground/10">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="uppercase tracking-wider opacity-80">{label}</span>
      <span className="font-serif text-base leading-none">{value}</span>
    </div>
  );
}

function LegendDot({ className }: { className: string }) {
  return <span className={`inline-block h-3 w-3 rounded-full ${className}`} />;
}
