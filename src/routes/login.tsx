import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const EMAIL_DOMAIN = "santoantonio.local";

function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = user.trim().toLowerCase();
      if (!u || !password) throw new Error("Preencha usuário e senha");
      const email = u.includes("@") ? u : `${u}@${EMAIL_DOMAIN}`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Usuário ou senha incorretos");
      navigate({ to: "/" });
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
          Acesso ao sistema
        </p>
        <form onSubmit={submit} className="space-y-3" autoComplete="off">
          <div>
            <Label htmlFor="user">Usuário</Label>
            <Input id="user" required value={user} autoFocus autoComplete="off"
              onChange={(e) => setUser(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
