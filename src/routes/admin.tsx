import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTables, fetchLabels, fetchSettings, type TableRow, type TextLabel } from "@/lib/floor-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Type, Trash2, LogOut, ArrowLeft, Save, Image as ImageIcon, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [labels, setLabels] = useState<TextLabel[]>([]);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [tableDraft, setTableDraft] = useState<Partial<TableRow>>({});
  const [labelDraft, setLabelDraft] = useState<Partial<TextLabel>>({});
  const [addLabelOpen, setAddLabelOpen] = useState(false);
  const [newLabelText, setNewLabelText] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login" });
      else setReady(true);
    });
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    fetchTables().then(setTables);
    fetchLabels().then(setLabels);
    fetchSettings().then((s) => setBgUrl(s.bg_image_url));
    const ch = supabase
      .channel("admin-floor")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" },
        () => fetchTables().then(setTables))
      .on("postgres_changes", { event: "*", schema: "public", table: "text_labels" },
        () => fetchLabels().then(setLabels))
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" },
        () => fetchSettings().then((s) => setBgUrl(s.bg_image_url)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ready]);

  async function uploadBg(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `bg-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("floor-bg").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("floor-bg").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase.from("settings").upsert({ id: 1, bg_image_url: url, updated_at: new Date().toISOString() });
      if (dbErr) throw dbErr;
      setBgUrl(url);
    } catch (e: any) {
      alert("Erro ao enviar imagem: " + (e.message ?? e));
    } finally {
      setUploading(false);
    }
  }

  async function removeBg() {
    await supabase.from("settings").upsert({ id: 1, bg_image_url: null, updated_at: new Date().toISOString() });
    setBgUrl(null);
  }

  const selT = tables.find((t) => t.id === selectedTable);
  const selL = labels.find((l) => l.id === selectedLabel);

  useEffect(() => {
    if (selT) setTableDraft(selT);
  }, [selectedTable]); // eslint-disable-line

  useEffect(() => {
    if (selL) setLabelDraft(selL);
  }, [selectedLabel]); // eslint-disable-line

  // Drag handlers
  function onDragStart(
    e: React.PointerEvent,
    kind: "table" | "label",
    id: string,
    startX: number,
    startY: number,
  ) {
    e.preventDefault();
    e.stopPropagation();
    if (kind === "table") { setSelectedTable(id); setSelectedLabel(null); }
    else { setSelectedLabel(id); setSelectedTable(null); }

    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const offX = (e.clientX / 1) - (rect.left + (startX / 100) * rect.width);
    const offY = (e.clientY / 1) - (rect.top + (startY / 100) * rect.height);

    function move(ev: PointerEvent) {
      const nx = ((ev.clientX - offX - rect.left) / rect.width) * 100;
      const ny = ((ev.clientY - offY - rect.top) / rect.height) * 100;
      const cx = Math.max(0, Math.min(100, nx));
      const cy = Math.max(0, Math.min(100, ny));
      if (kind === "table") {
        setTables((arr) => arr.map((t) => t.id === id ? { ...t, x: cx, y: cy } : t));
      } else {
        setLabels((arr) => arr.map((l) => l.id === id ? { ...l, x: cx, y: cy } : l));
      }
    }
    async function up(ev: PointerEvent) {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const nx = ((ev.clientX - offX - rect.left) / rect.width) * 100;
      const ny = ((ev.clientY - offY - rect.top) / rect.height) * 100;
      const cx = Math.max(0, Math.min(100, nx));
      const cy = Math.max(0, Math.min(100, ny));
      if (kind === "table") {
        await supabase.from("tables").update({ x: cx, y: cy }).eq("id", id);
      } else {
        await supabase.from("text_labels").update({ x: cx, y: cy }).eq("id", id);
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  async function addTable() {
    const maxN = tables.reduce((m, t) => Math.max(m, t.number), 0);
    await supabase.from("tables").insert({
      number: maxN + 1, x: 50, y: 50, w: 7, h: 5, shape: "square", seats: 4,
    });
  }

  async function saveTable() {
    if (!selT) return;
    const patch = {
      number: Number(tableDraft.number ?? selT.number),
      seats: Number(tableDraft.seats ?? selT.seats),
      shape: (tableDraft.shape ?? selT.shape) as "square" | "circle",
      w: Number(tableDraft.w ?? selT.w),
      h: Number(tableDraft.h ?? selT.h),
      label: tableDraft.label ?? selT.label,
    };
    await supabase.from("tables").update(patch).eq("id", selT.id);
  }

  async function deleteTable() {
    if (!selT) return;
    if (!confirm(`Apagar mesa ${selT.number}?`)) return;
    await supabase.from("tables").delete().eq("id", selT.id);
    setSelectedTable(null);
  }

  async function saveLabel() {
    if (!selL) return;
    await supabase.from("text_labels").update({
      text: labelDraft.text ?? selL.text,
      font_size: Number(labelDraft.font_size ?? selL.font_size),
    }).eq("id", selL.id);
  }

  async function deleteLabel() {
    if (!selL) return;
    await supabase.from("text_labels").delete().eq("id", selL.id);
    setSelectedLabel(null);
  }

  async function addLabel() {
    if (!newLabelText.trim()) return;
    await supabase.from("text_labels").insert({
      x: 50, y: 50, text: newLabelText.trim(), font_size: 16,
    });
    setNewLabelText("");
    setAddLabelOpen(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-20 shadow">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/" className="opacity-80 hover:opacity-100"><ArrowLeft className="h-4 w-4" /></Link>
            <div>
              <h1 className="font-serif text-xl leading-tight">Santo Antônio</h1>
              <p className="text-[10px] opacity-80 tracking-[0.2em] uppercase">Painel Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="secondary" onClick={addTable}>
              <Plus className="h-3 w-3" /> Mesa
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAddLabelOpen(true)}>
              <Type className="h-3 w-3" /> Texto
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadBg(f);
                if (e.target) e.target.value = "";
              }}
            />
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImageIcon className="h-3 w-3" /> {uploading ? "..." : (bgUrl ? "Trocar fundo" : "Fundo")}
            </Button>
            {bgUrl && (
              <Button size="sm" variant="ghost" onClick={removeBg} className="text-primary-foreground hover:bg-primary-foreground/10">
                <X className="h-3 w-3" /> Remover fundo
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={logout} className="text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="h-3 w-3" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 md:px-6 py-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2 text-center">
            Arraste mesas e textos para reposicionar · clique para editar
          </p>
          <div
            ref={boardRef}
            className="relative mx-auto rounded-lg border-2 border-dashed border-border bg-card touch-none"
            style={{ aspectRatio: "1357 / 1920", maxWidth: "780px" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedTable(null); setSelectedLabel(null);
              }
            }}
          >
            {labels.map((l) => {
              const sel = l.id === selectedLabel;
              return (
                <div
                  key={l.id}
                  onPointerDown={(e) => onDragStart(e, "label", l.id, l.x, l.y)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-serif font-semibold whitespace-nowrap cursor-move px-1 select-none ${
                    sel ? "ring-2 ring-primary bg-primary/10 rounded" : "text-muted-foreground"
                  }`}
                  style={{ left: `${l.x}%`, top: `${l.y}%`, fontSize: `${l.font_size}px` }}
                >
                  {l.text}
                </div>
              );
            })}
            {tables.map((t) => {
              const sel = t.id === selectedTable;
              const isCircle = t.shape === "circle";
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => onDragStart(e, "table", t.id, t.x, t.y)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-serif text-[10px] md:text-xs font-semibold flex flex-col items-center justify-center leading-none cursor-move select-none ${
                    isCircle ? "rounded-full" : "rounded-sm"
                  } ${
                    sel
                      ? "bg-primary text-primary-foreground ring-2 ring-ring ring-offset-1"
                      : t.occupied
                        ? "bg-destructive text-destructive-foreground border-2 border-destructive"
                        : "bg-card text-primary border-2 border-primary/60"
                  }`}
                  style={{ left: `${t.x}%`, top: `${t.y}%`, width: `${t.w}%`, height: `${t.h}%` }}
                >
                  <span>{t.number}</span>
                  <span className="text-[8px] opacity-70">{t.seats}p</span>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="bg-card border border-border rounded-lg p-4 h-fit lg:sticky lg:top-20">
          {selT ? (
            <div className="space-y-3">
              <h3 className="font-serif text-lg">Editar mesa</h3>
              <Field label="Número">
                <Input type="number" value={tableDraft.number ?? selT.number}
                  onChange={(e) => setTableDraft({ ...tableDraft, number: Number(e.target.value) })} />
              </Field>
              <Field label="Lugares">
                <Input type="number" min={1} value={tableDraft.seats ?? selT.seats}
                  onChange={(e) => setTableDraft({ ...tableDraft, seats: Number(e.target.value) })} />
              </Field>
              <Field label="Forma">
                <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={tableDraft.shape ?? selT.shape}
                  onChange={(e) => setTableDraft({ ...tableDraft, shape: e.target.value as any })}>
                  <option value="square">Quadrado</option>
                  <option value="circle">Círculo</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Largura %">
                  <Input type="number" step={0.5} value={tableDraft.w ?? selT.w}
                    onChange={(e) => setTableDraft({ ...tableDraft, w: Number(e.target.value) })} />
                </Field>
                <Field label="Altura %">
                  <Input type="number" step={0.5} value={tableDraft.h ?? selT.h}
                    onChange={(e) => setTableDraft({ ...tableDraft, h: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="Rótulo (opcional)">
                <Input value={tableDraft.label ?? selT.label ?? ""}
                  onChange={(e) => setTableDraft({ ...tableDraft, label: e.target.value })} />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveTable} className="flex-1"><Save className="h-3 w-3" /> Salvar</Button>
                <Button variant="destructive" onClick={deleteTable}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ) : selL ? (
            <div className="space-y-3">
              <h3 className="font-serif text-lg">Editar texto</h3>
              <Field label="Texto">
                <Input value={labelDraft.text ?? selL.text}
                  onChange={(e) => setLabelDraft({ ...labelDraft, text: e.target.value })} />
              </Field>
              <Field label="Tamanho (px)">
                <Input type="number" min={8} max={64} value={labelDraft.font_size ?? selL.font_size}
                  onChange={(e) => setLabelDraft({ ...labelDraft, font_size: Number(e.target.value) })} />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveLabel} className="flex-1"><Save className="h-3 w-3" /> Salvar</Button>
                <Button variant="destructive" onClick={deleteLabel}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Como usar</p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>Clique em <b>+ Mesa</b> ou <b>+ Texto</b> para adicionar.</li>
                <li>Arraste itens no mapa para reposicionar.</li>
                <li>Clique num item para editar capacidade, forma, tamanho ou apagar.</li>
                <li>Alterações são salvas automaticamente.</li>
              </ul>
              <div className="pt-2 mt-2 border-t border-border text-xs">
                <p><b>{tables.length}</b> mesas · <b>{labels.length}</b> textos</p>
              </div>
            </div>
          )}
        </aside>
      </main>

      <Dialog open={addLabelOpen} onOpenChange={setAddLabelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar texto</DialogTitle></DialogHeader>
          <Field label="Texto">
            <Input autoFocus value={newLabelText}
              onChange={(e) => setNewLabelText(e.target.value)}
              placeholder="Ex: Adega, Brinquedoteca, Cozinha"
              onKeyDown={(e) => e.key === "Enter" && addLabel()} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLabelOpen(false)}>Cancelar</Button>
            <Button onClick={addLabel}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
