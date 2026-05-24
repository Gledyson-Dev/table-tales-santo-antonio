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
import floorPlan from "@/assets/floor-plan.png";

export const Route = createFileRoute("/")({
  component: Index,
});

type Shape = "square" | "circle";
type Table = { n: number; x: number; y: number; w?: number; h?: number; shape?: Shape };

// Posições em % sobre a imagem do plano (1357x1920)
const TABLES: Table[] = [
  { n: 30, x: 19.5, y: 4.2, shape: "circle", w: 6, h: 4.2 },
  { n: 40, x: 31.7, y: 4.7, w: 6, h: 4.2 },
  { n: 20, x: 45.3, y: 4.2, shape: "circle", w: 6, h: 4.2 },

  { n: 31, x: 19.5, y: 10.7 },
  { n: 29, x: 32.8, y: 10.7 },
  { n: 24, x: 40.2, y: 10.7 },
  { n: 21, x: 47.2, y: 10.7 },

  { n: 32, x: 19.5, y: 16.1 },
  { n: 28, x: 32.8, y: 16.1 },
  { n: 25, x: 40.2, y: 16.1 },
  { n: 23, x: 47.2, y: 16.1 },

  { n: 33, x: 19.5, y: 21.9 },
  { n: 46, x: 32.8, y: 21.9 },
  { n: 36, x: 39.8, y: 21.9 },
  { n: 26, x: 46.8, y: 21.9 },

  { n: 34, x: 19.5, y: 28.4 },
  { n: 27, x: 29.1, y: 28.4 },

  { n: 76, x: 74.4, y: 28.4 },
  { n: 78, x: 82.2, y: 28.4 },
  { n: 77, x: 74.4, y: 31.5 },
  { n: 79, x: 82.2, y: 31.5 },

  { n: 14, x: 47.5, y: 31.5 },
  { n: 75, x: 55.6, y: 31.5 },

  { n: 12, x: 47.5, y: 37.8 },
  { n: 73, x: 55.6, y: 37.8 },
  { n: 74, x: 63.4, y: 37.8 },

  { n: 80, x: 76.6, y: 39.8 },
  { n: 81, x: 84.4, y: 39.8 },

  { n: 11, x: 47.5, y: 43.2 },
  { n: 71, x: 55.6, y: 43.2 },
  { n: 72, x: 63.4, y: 43.2 },
  { n: 82, x: 84.4, y: 43.0 },

  { n: 16, x: 37.6, y: 45.8 },
  { n: 10, x: 47.5, y: 49.0 },
  { n: 69, x: 55.6, y: 49.0 },
  { n: 70, x: 63.4, y: 49.0 },
  { n: 15, x: 37.6, y: 50.8 },

  { n: 9, x: 47.5, y: 54.7 },
  { n: 67, x: 55.6, y: 54.7 },
  { n: 68, x: 63.4, y: 54.7 },

  { n: 8, x: 47.5, y: 60.4 },
  { n: 51, x: 56.0, y: 61.5 },
  { n: 52, x: 63.7, y: 61.5 },

  { n: 53, x: 79.2, y: 64.1 },
  { n: 7, x: 38.7, y: 65.6 },
  { n: 54, x: 79.2, y: 68.8 },
  { n: 6, x: 38.7, y: 70.8 },

  { n: 5, x: 47.5, y: 74.5 },
  { n: 63, x: 60.1, y: 74.5 },
  { n: 64, x: 70.7, y: 74.5 },
  { n: 55, x: 81.8, y: 74.5 },

  { n: 4, x: 47.5, y: 80.2 },
  { n: 62, x: 60.1, y: 80.2 },
  { n: 65, x: 70.7, y: 80.2 },
  { n: 56, x: 81.8, y: 80.2 },

  { n: 3, x: 47.5, y: 85.4 },
  { n: 61, x: 60.4, y: 86.5 },
  { n: 66, x: 70.7, y: 85.4 },
  { n: 57, x: 81.8, y: 85.4 },

  { n: 2, x: 47.5, y: 91.1 },
  { n: 60, x: 64.8, y: 92.2, shape: "circle", w: 6, h: 4.2 },
  { n: 58, x: 81.8, y: 91.4 },

  { n: 1, x: 47.5, y: 96.6 },
  { n: 59, x: 81.8, y: 96.6 },
];

type TableState = { occupied: boolean; name?: string; since?: number };
type StateMap = Record<number, TableState>;

const STORAGE_KEY = "santo-antonio-tables-v3";
const DEFAULT_W = 7;
const DEFAULT_H = 5;

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
              Gestão de Mesas
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
          <LegendDot className="bg-destructive" /> Ocupada
        </div>

        <div
          className="relative mx-auto rounded-lg overflow-hidden shadow-lg border border-border bg-card"
          style={{ aspectRatio: "1357 / 1920", maxWidth: "780px" }}
        >
          <img
            src={floorPlan}
            alt="Plano do restaurante Santo Antônio"
            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
          <div className="absolute inset-0">
            {TABLES.map((t) => {
              const st = state[t.n];
              const occ = !!st?.occupied;
              const w = t.w ?? DEFAULT_W;
              const h = t.h ?? DEFAULT_H;
              const isCircle = t.shape === "circle";
              return (
                <button
                  key={t.n}
                  onClick={() => handleClick(t.n)}
                  title={
                    occ
                      ? `Mesa ${t.n} — ${st?.name ?? "Ocupada"} (toque para liberar)`
                      : `Mesa ${t.n} — Livre`
                  }
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-serif text-[10px] md:text-xs font-semibold flex items-center justify-center transition-all hover:scale-110 hover:z-10 ${
                    isCircle ? "rounded-full" : "rounded-sm"
                  } ${
                    occ
                      ? "bg-destructive text-destructive-foreground border-2 border-destructive shadow-md"
                      : "bg-transparent text-primary border-2 border-primary/60 hover:bg-primary/10"
                  }`}
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    width: `${w}%`,
                    height: `${h}%`,
                  }}
                >
                  {t.n}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Toque numa mesa livre para ocupar · numa ocupada (vermelha) para liberar
        </p>

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
                      <span className="font-serif text-lg text-destructive">
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
  return <span className={`inline-block h-3 w-3 rounded-sm ${className}`} />;
}
