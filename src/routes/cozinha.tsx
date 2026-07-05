import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { time } from "@/lib/format";
import { toast } from "sonner";
import { ChefHat, Check } from "lucide-react";

export const Route = createFileRoute("/cozinha")({ component: CozinhaPage });

type OrderItem = {
  id: string; order_id: string; name: string; qty: number;
  status: string; notes: string | null; created_at: string;
};
type Order = { id: string; table_number: number };

const NEXT: Record<string, string> = { new: "preparing", preparing: "ready", ready: "delivered" };
const LABEL: Record<string, string> = { new: "Novo", preparing: "Preparando", ready: "Pronto", delivered: "Entregue" };

function CozinhaPage() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    const { data } = await supabase.from("order_items").select("*").in("status", ["new", "preparing", "ready"]).order("created_at");
    const { data: os } = await supabase.from("orders").select("id, table_number").eq("status", "open");
    if (data) setItems(data as OrderItem[]);
    if (os) setOrders(os as Order[]);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("kitchen")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const tableOf = (orderId: string) => orders.find((o) => o.id === orderId)?.table_number ?? "?";

  async function advance(it: OrderItem) {
    const next = NEXT[it.status];
    if (!next) return;
    const { error } = await supabase.from("order_items").update({ status: next }).eq("id", it.id);
    if (error) toast.error(error.message);
    else toast.success(`${it.name} → ${LABEL[next]}`);
  }

  const cols: Array<[string, string]> = [["new", "Novos"], ["preparing", "Preparando"], ["ready", "Prontos"]];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Cozinha" subtitle="Pedidos em tempo real" />
      <main className="mx-auto max-w-7xl px-3 md:px-6 py-6">
        {items.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum pedido em andamento.</p>
            <Link to="/" className="text-primary hover:underline text-sm">Ir para o salão</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cols.map(([status, label]) => {
              const col = items.filter((i) => i.status === status);
              return (
                <div key={status} className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-serif text-lg">{label}</h2>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{col.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {col.map((it) => (
                      <li key={it.id} className="border border-border rounded-md p-2 bg-background">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">Mesa {tableOf(it.order_id)} · {time(it.created_at)}</div>
                            <div className="font-medium">{it.qty}× {it.name}</div>
                            {it.notes && <div className="text-xs italic text-muted-foreground mt-1">"{it.notes}"</div>}
                          </div>
                          <Button size="sm" variant={status === "ready" ? "default" : "outline"} onClick={() => advance(it)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </li>
                    ))}
                    {col.length === 0 && <li className="text-center text-xs text-muted-foreground py-6">—</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
