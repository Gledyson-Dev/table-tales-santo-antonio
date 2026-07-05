import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, EyeOff, Eye } from "lucide-react";
import { AppHeader } from "@/components/AppNav";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/cardapio")({ component: CardapioPage });

type Category = { id: string; name: string; sort_order: number; active: boolean };
type Item = {
  id: string; category_id: string | null; name: string; description: string | null;
  price: number; image_url: string | null; available: boolean; sort_order: number;
};

function CardapioPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login" });
      else setReady(true);
    });
  }, [navigate]);

  async function load() {
    const [c, i] = await Promise.all([
      supabase.from("menu_categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("sort_order"),
    ]);
    if (c.data) { setCats(c.data as Category[]); if (!activeCat && c.data[0]) setActiveCat((c.data[0] as Category).id); }
    if (i.data) setItems(i.data as Item[]);
  }

  useEffect(() => { if (ready) load(); }, [ready]); // eslint-disable-line

  async function addCategory() {
    if (!newCat.trim()) return;
    const { error } = await supabase.from("menu_categories").insert({ name: newCat.trim(), sort_order: cats.length });
    if (error) toast.error(error.message); else { toast.success("Categoria criada"); setNewCat(""); load(); }
  }
  async function toggleCat(c: Category) {
    await supabase.from("menu_categories").update({ active: !c.active }).eq("id", c.id);
    load();
  }
  async function delCat(c: Category) {
    if (!confirm(`Apagar categoria "${c.name}"? Os itens ficarão sem categoria.`)) return;
    await supabase.from("menu_categories").delete().eq("id", c.id);
    load();
  }

  async function saveItem() {
    if (!editing) return;
    const payload = {
      name: (editing.name ?? "").trim(),
      description: editing.description ?? null,
      price: Number(editing.price ?? 0),
      category_id: editing.category_id ?? activeCat ?? null,
      available: editing.available ?? true,
      image_url: editing.image_url ?? null,
    };
    if (!payload.name) { toast.error("Nome obrigatório"); return; }
    const res = editing.id
      ? await supabase.from("menu_items").update(payload).eq("id", editing.id)
      : await supabase.from("menu_items").insert(payload);
    if (res.error) toast.error(res.error.message);
    else { toast.success("Salvo"); setEditing(null); load(); }
  }
  async function delItem(i: Item) {
    if (!confirm(`Apagar "${i.name}"?`)) return;
    await supabase.from("menu_items").delete().eq("id", i.id);
    load();
  }

  const visible = items.filter((i) => (activeCat ? i.category_id === activeCat : true));

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Cardápio" subtitle="Gestão de itens" />
      <main className="mx-auto max-w-6xl px-3 md:px-6 py-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        <aside className="space-y-2">
          <div className="bg-card border border-border rounded-lg p-3 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Categorias</div>
            <div className="flex gap-1">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nova..." className="h-8" onKeyDown={(e) => e.key === "Enter" && addCategory()} />
              <Button size="sm" onClick={addCategory}><Plus className="h-3 w-3" /></Button>
            </div>
            <ul className="space-y-1">
              {cats.map((c) => (
                <li key={c.id} className={`flex items-center gap-1 rounded-md ${activeCat === c.id ? "bg-primary/10" : ""}`}>
                  <button onClick={() => setActiveCat(c.id)} className={`flex-1 text-left px-2 py-1.5 text-sm truncate ${c.active ? "" : "line-through opacity-60"}`}>{c.name}</button>
                  <button onClick={() => toggleCat(c)} title={c.active ? "Ocultar" : "Mostrar"} className="p-1 opacity-60 hover:opacity-100">
                    {c.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => delCat(c)} className="p-1 opacity-60 hover:opacity-100 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {cats.length === 0 && <li className="text-xs text-muted-foreground px-2 py-4 text-center">Nenhuma categoria</li>}
            </ul>
          </div>
        </aside>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">{cats.find((c) => c.id === activeCat)?.name ?? "Itens"}</h2>
            <Button size="sm" onClick={() => setEditing({ available: true, price: 0, category_id: activeCat })}>
              <Plus className="h-3 w-3" /> Item
            </Button>
          </div>
          {visible.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12 border-2 border-dashed border-border rounded-lg">Sem itens.</div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {visible.map((i) => (
                <li key={i.id} className={`border border-border rounded-lg p-3 bg-card ${i.available ? "" : "opacity-60"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      {i.description && <div className="text-xs text-muted-foreground line-clamp-2">{i.description}</div>}
                      <div className="font-serif text-lg mt-1">{brl(Number(i.price))}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => setEditing(i)} className="p-1 hover:bg-accent rounded"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => delItem(i)} className="p-1 hover:bg-accent rounded text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar item" : "Novo item"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus /></div>
              <div><Label>Descrição</Label><Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div>
                  <Label>Categoria</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={editing.category_id ?? ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                    <option value="">Sem categoria</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.available ?? true} onCheckedChange={(v) => setEditing({ ...editing, available: v })} />
                <Label className="!m-0">Disponível</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
