import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { useSessionRoles } from "@/lib/roles";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/caixa")({ component: CaixaPage });

type OpenOrder = {
  id: string;
  table_id: string | null;
  table_number: number | null;
  occupied_name: string | null;
  subtotal: number;
  total: number;
  opened_at: string;
};

function CaixaPage() {
  const nav = useNavigate();
  const s = useSessionRoles();
  const [orders, setOrders] = useState<OpenOrder[]>([]);

  useEffect(() => {
    if (s.loading) return;
    if (!s.authed) { nav({ to: "/login" }); return; }
    if (!s.isAny(["admin", "cashier"])) { nav({ to: "/" }); return; }
  }, [s.loading, s.authed, s.roles.join(",")]); // eslint-disable-line

  async function load() {
    const { data } = await supabase.from("orders").select("id, table_id, table_number, occupied_name, subtotal, total, opened_at").eq("status", "open").order("opened_at");
    setOrders((data ?? []) as any);
  }

  useEffect(() => {
    if (!s.authed) return;
    load();
    const ch = supabase.channel("caixa")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [s.authed]);

  if (s.loading || !s.authed) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Caixa" subtitle="Comandas em aberto" />
      <main className="mx-auto max-w-5xl px-3 md:px-6 py-6">
        {orders.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-16 border-2 border-dashed border-border rounded-lg">
            Nenhuma comanda em aberto.
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map((o) => (
              <li key={o.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="font-serif text-2xl">Mesa {o.table_number ?? "?"}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(o.opened_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground truncate">{o.occupied_name ?? "—"}</div>
                <div className="flex items-baseline justify-between border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="font-serif text-xl">{brl(Number(o.total))}</span>
                </div>
                {o.table_id && (
                  <Button asChild className="w-full" size="sm">
                    <Link to="/pedidos/$tableId" params={{ tableId: o.table_id }}>
                      <ClipboardList className="h-3.5 w-3.5" /> Abrir e fechar
                    </Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
