import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";
const ADMIN_EMAIL = "admin@santoantonio.local";
const ADMIN_REAL_PASS = "admin123";

function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (user.trim().toLowerCase() !== ADMIN_USER || password !== ADMIN_PASS) {
        throw new Error("Usuário ou senha incorretos");
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_REAL_PASS,
      });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (err: any) {
      setError(err.message ?? "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-lg p-6 shadow-lg">
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          ← voltar
        </Link>
        <h1 className="font-serif text-3xl mt-2 mb-1">Santo Antônio</h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">
          Acesso administrativo
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="user">Usuário</Label>
            <Input id="user" required value={user} autoFocus
              onChange={(e) => setUser(e.target.value)} placeholder="admin" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="admin" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-[10px] text-center text-muted-foreground">
          Somente administradores podem alterar o layout.
        </p>
      </div>
    </div>
  );
}
