import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "./ThemeToggle";
import { LayoutGrid, History, UtensilsCrossed, ChefHat, Settings, LogIn } from "lucide-react";

const NAV = [
  { to: "/", label: "Salão", icon: LayoutGrid },
  { to: "/cozinha", label: "Cozinha", icon: ChefHat },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/cardapio", label: "Cardápio", icon: UtensilsCrossed, adminOnly: true },
] as const;

export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

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
            <ThemeToggle />
            {authed ? (
              <Link to="/admin" title="Admin" className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20">
                <Settings className="h-4 w-4" />
              </Link>
            ) : (
              <Link to="/login" title="Entrar" className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20">
                <LogIn className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-0.5">
          {NAV.filter((n) => !("adminOnly" in n && n.adminOnly) || authed).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 whitespace-nowrap"
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
