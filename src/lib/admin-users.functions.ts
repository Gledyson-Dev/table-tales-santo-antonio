import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMAIL_DOMAIN = "santoantonio.local";
const UsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Usuário deve ter 3+ caracteres")
  .max(32)
  .regex(/^[a-z0-9._-]+$/, "Use apenas letras, números, . _ -");

const CreateSchema = z.object({
  username: UsernameSchema,
  password: z.string().min(6),
  role: z.enum(["admin", "kitchen", "waiter", "cashier"]),
});

const DeleteSchema = z.object({ userId: z.string().uuid() });

function usernameToEmail(u: string) {
  return `${u}@${EMAIL_DOMAIN}`;
}
function emailToUsername(e: string) {
  return e.endsWith(`@${EMAIL_DOMAIN}`) ? e.slice(0, -1 - EMAIL_DOMAIN.length) : e;
}

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Apenas administradores podem gerenciar contas");
}

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    const { data: roles } = await supabaseAdmin.from("user_roles" as any).select("user_id, role");
    const rolesMap = new Map<string, string[]>();
    for (const r of (roles ?? []) as any[]) {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    }
    return users.users.map((u) => ({
      id: u.id,
      username: emailToUsername(u.email ?? ""),
      created_at: u.created_at,
      roles: rolesMap.get(u.id) ?? [],
    }));
  });

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = usernameToEmail(data.username);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message.includes("already") ? "Usuário já existe" : error.message);
    const { error: rErr } = await supabaseAdmin.from("user_roles" as any).insert({
      user_id: created.user!.id, role: data.role,
    });
    if (rErr) throw rErr;
    return { ok: true, id: created.user!.id };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DeleteSchema.parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode apagar sua própria conta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });
