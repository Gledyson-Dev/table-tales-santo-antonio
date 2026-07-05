import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppNav";
import { brl, time } from "@/lib/format";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Minus, Trash2, Printer, CreditCard, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/pedidos/$tableId")({ component: PedidosPage });

type Table = { id: string; number: number; seats: number; occupied: boolean };
type Category = { id: string; name: string; sort_order: number; active: boolean };
type Item = { id: string; name: string; price: number; category_id: string | null; available: boolean };
type Order = {
  id: string; table_id: string | null; table_number: number; status: string;
  subtotal: number; service_fee_pct: number; service_fee: number; discount: number; total: number;
  payment_method: string | null; opened_at: string; closed_at: string | null;
};
type OI = { id: string; order_id: string; name: string; qty: number; unit_price: number; line_total: number; status: string; notes: string | null };

function PedidosPage() {
  const { tableId } = Route.useParams();
  const navigate = useNavigate();
  const [table, setTable] = useState<Table | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OI[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [menu, setMenu] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [addItem, setAddItem] = useState<Item | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addNotes, setAddNotes] = useState("");
  const [closing, setClosing] = useState(false);
  const [discount, setDiscount] = useState("0");
  const [payment, setPayment] = useState("Dinheiro");
  const [feePct, setFeePct] = useState("10");

  async function loadAll() {
    const { data: t } = await supabase.from("tables").select("id, number, seats, occupied").eq("id", tableId).maybeSingle();
    if (t) setTable(t as Table);
    const { data: o } = await supabase.from("orders").select("*").eq("table_id", tableId).eq("status", "open").order("opened_at", { ascending: false }).limit(1).maybeSingle();
    if (o) {
      setOrder(o as Order);
      setFeePct(String((o as Order).service_fee_pct));
      const { data: its } = await supabase.from("order_items").select("*").eq("order_id", (o as Order).id).order("created_at");
      setItems((its ?? []) as OI[]);
    } else {
      setOrder(null); setItems([]);
    }
    const [c, m] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("active", true).order("sort_order"),
      supabase.from("menu_items").select("*").eq("available", true).order("sort_order"),
    ]);
    if (c.data) { setCats(c.data as Category[]); if (!activeCat && c.data[0]) setActiveCat((c.data[0] as Category).id); }
    if (m.data) setMenu(m.data as Item[]);
  }

  useEffect(() => {
    loadAll();
    const ch = supabase.channel(`ped-${tableId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `table_id=eq.${tableId}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tableId]); // eslint-disable-line

  async function ensureOrder(): Promise<Order | null> {
    if (order) return order;
    if (!table) return null;
    const { data, error } = await supabase.from("orders").insert({
      table_id: table.id, table_number: table.number, status: "open", service_fee_pct: 10,
    }).select("*").single();
    if (error) { toast.error(error.message); return null; }
    setOrder(data as Order);
    return data as Order;
  }

  async function addToOrder() {
    if (!addItem) return;
    const o = await ensureOrder();
    if (!o) return;
    const qty = Math.max(1, addQty);
    const line = Number(addItem.price) * qty;
    const { error } = await supabase.from("order_items").insert({
      order_id: o.id, menu_item_id: addItem.id, name: addItem.name, qty,
      unit_price: addItem.price, line_total: line, notes: addNotes.trim() || null, status: "new",
    });
    if (error) toast.error(error.message);
    else { toast.success(`${addItem.name} adicionado`); setAddItem(null); setAddQty(1); setAddNotes(""); await recalc(o.id); }
  }
  async function bump(it: OI, delta: number) {
    const q = it.qty + delta;
    if (q <= 0) { await supabase.from("order_items").delete().eq("id", it.id); }
    else { await supabase.from("order_items").update({ qty: q, line_total: q * Number(it.unit_price) }).eq("id", it.id); }
    if (order) await recalc(order.id);
  }
  async function recalc(orderId: string) {
    const { data } = await supabase.from("order_items").select("line_total").eq("order_id", orderId);
    const subtotal = (data ?? []).reduce((s: number, r: any) => s + Number(r.line_total || 0), 0);
    const pct = Number(feePct) || 0;
    const fee = subtotal * (pct / 100);
    const total = Math.max(0, subtotal + fee - Number(discount || 0));
    await supabase.from("orders").update({ subtotal, service_fee: fee, service_fee_pct: pct, discount: Number(discount) || 0, total }).eq("id", orderId);
  }

  const subtotal = useMemo(() => items.reduce((s, i) => s + Number(i.line_total || 0), 0), [items]);
  const fee = useMemo(() => subtotal * ((Number(feePct) || 0) / 100), [subtotal, feePct]);
  const total = useMemo(() => Math.max(0, subtotal + fee - (Number(discount) || 0)), [subtotal, fee, discount]);

  async function closeOrder() {
    if (!order || !table) return;
    await supabase.from("orders").update({
      status: "closed", closed_at: new Date().toISOString(),
      subtotal, service_fee: fee, service_fee_pct: Number(feePct) || 0,
      discount: Number(discount) || 0, total, payment_method: payment,
    }).eq("id", order.id);
    // liberar mesa + fechar visita
    await supabase.from("tables").update({ occupied: false, occupied_name: null, occupied_since: null }).eq("id", table.id);
    const { data: v } = await supabase.from("table_visits").select("id").eq("table_id", table.id).is("ended_at", null).order("started_at", { ascending: false }).limit(1);
    if (v?.[0]?.id) await supabase.from("table_visits").update({ ended_at: new Date().toISOString() }).eq("id", v[0].id);
    toast.success(`Conta fechada · ${brl(total)}`);
    setClosing(false);
    navigate({ to: "/" });
  }

  const filteredMenu = menu.filter((m) => (activeCat ? m.category_id === activeCat : true));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={table ? `Mesa ${table.number}` : "Pedido"} subtitle="Comanda" />
      <main className="mx-auto max-w-6xl px-3 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Link to="/" className="p-1.5 rounded-md hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
            <h2 className="font-serif text-xl">Cardápio</h2>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {cats.map((c) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${activeCat === c.id ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                {c.name}
              </button>
            ))}
          </div>
          {filteredMenu.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhum item disponível. <Link to="/cardapio" className="text-primary underline">Configurar cardápio</Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredMenu.map((m) => (
                <li key={m.id}>
                  <button onClick={() => { setAddItem(m); setAddQty(1); setAddNotes(""); }}
                    className="w-full text-left border border-border rounded-lg p-3 bg-card hover:border-primary hover:shadow-sm transition-all">
                    <div className="font-medium text-sm truncate">{m.name}</div>
                    <div className="font-serif text-lg text-primary">{brl(Number(m.price))}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="bg-card border border-border rounded-lg p-4 h-fit lg:sticky lg:top-32">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg">Comanda</h3>
            {order && <span className="text-xs text-muted-foreground">aberta {time(order.opened_at)}</span>}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum item. Toque num produto para adicionar.</p>
          ) : (
            <ul className="divide-y divide-border mb-3 max-h-[40vh] overflow-y-auto">
              {items.map((i) => (
                <li key={i.id} className="py-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{brl(Number(i.unit_price))} · <span className="capitalize">{i.status}</span></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => bump(i, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center text-sm font-medium">{i.qty}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => bump(i, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <div className="w-16 text-right text-sm font-medium">{brl(Number(i.line_total))}</div>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-1 text-sm border-t border-border pt-3">
            <Row label="Subtotal" value={brl(subtotal)} />
            <Row label={`Serviço (${feePct}%)`} value={brl(fee)} />
            {Number(discount) > 0 && <Row label="Desconto" value={`- ${brl(Number(discount))}`} />}
            <Row label="Total" value={brl(total)} strong />
          </div>
          <Button className="w-full mt-3" disabled={items.length === 0} onClick={() => setClosing(true)}>
            <CreditCard className="h-4 w-4" /> Fechar conta
          </Button>
        </aside>
      </main>

      <Dialog open={!!addItem} onOpenChange={(o) => !o && setAddItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{addItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Quantidade</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddQty(Math.max(1, addQty - 1))}><Minus className="h-3 w-3" /></Button>
                <Input type="number" min={1} value={addQty} onChange={(e) => setAddQty(Math.max(1, Number(e.target.value) || 1))} className="text-center" />
                <Button variant="outline" size="sm" onClick={() => setAddQty(addQty + 1)}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Ex: sem cebola" />
            </div>
            <div className="text-right font-serif text-xl">{brl(Number(addItem?.price ?? 0) * addQty)}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItem(null)}>Cancelar</Button>
            <Button onClick={addToOrder}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closing} onOpenChange={setClosing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fechar conta · Mesa {table?.number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Taxa serviço (%)</Label><Input type="number" value={feePct} onChange={(e) => setFeePct(e.target.value)} /></div>
              <div><Label>Desconto (R$)</Label><Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={payment} onChange={(e) => setPayment(e.target.value)}>
                {["Dinheiro", "Débito", "Crédito", "Pix", "Vale-refeição"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
              <Row label="Subtotal" value={brl(subtotal)} />
              <Row label={`Serviço (${feePct}%)`} value={brl(fee)} />
              {Number(discount) > 0 && <Row label="Desconto" value={`- ${brl(Number(discount))}`} />}
              <Row label="Total" value={brl(total)} strong />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-3 w-3" /> Imprimir</Button>
            <Button onClick={closeOrder}>Confirmar pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-serif text-lg pt-1 border-t border-border" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
