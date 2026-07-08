import { Link } from "@tanstack/react-router";
import { useSessionRoles, type AppRole } from "@/lib/roles";
import { LayoutGrid, History, UtensilsCrossed, ChefHat, Settings, LogIn, Wallet } from "lucide-react";

type NavItem = {
  to: "/" | "/cozinha" | "/cardapio" | "/caixa" | "/historico" | "/admin";
  label: string;
  icon: any;
  // undefined = visible for everyone; array = requires any of these roles OR admin
  roles?: AppRole[];
};

const NAV: NavItem[] = [
  { to: "/", label: "Salão", icon: LayoutGrid, roles: ["waiter", "cashier"] },
  { to: "/cozinha", label: "Cozinha", icon: ChefHat, roles: ["kitchen"] },
  { to: "/caixa", label: "Caixa", icon: Wallet, roles: ["cashier"] },
  { to: "/cardapio", label: "Cardápio", icon: UtensilsCrossed, roles: [] }, // admin only
  { to: "/historico", label: "Histórico", icon: History, roles: [] }, // admin only
];

export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const s = useSessionRoles();
  const isAdmin = s.is("admin");

  // Not authed → show only /
  const items = !s.authed
    ? [{ to: "/" as const, label: "Salão", icon: LayoutGrid }]
    : NAV.filter((n) => {
        if (isAdmin) return true;
        if (!n.roles) return true;
        if (n.roles.length === 0) return false; // admin only
        return n.roles.some((r) => s.is(r));
      });

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-20 shadow">
      <div className="mx-auto max-w-6xl px-3 md:px-4 py-3 space-y-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <h1 className="font-serif text-lg md:text-2xl leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-[9px] md:text-xs opacity-80 tracking-[0.2em] uppercase mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {right}
            {s.authed ? (
              isAdmin && (
                <Link to="/admin" title="Admin" className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                  <Settings className="h-4 w-4" />
                </Link>
              )
            ) : (
              <Link to="/login" title="Entrar" className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                <LogIn className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-0.5">
          {items.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 whitespace-nowrap transition-colors"
              activeProps={{ className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-primary-foreground text-primary whitespace-nowrap font-medium" }}
              activeOptions={{ exact: true }}
            >
              <n.icon className="h-3.5 w-3.5" />
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
