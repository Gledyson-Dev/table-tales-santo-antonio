import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "kitchen" | "waiter" | "cashier";

export type SessionRoles = {
  loading: boolean;
  authed: boolean;
  userId: string | null;
  email: string | null;
  roles: AppRole[];
  is: (r: AppRole) => boolean;
  isAny: (rs: AppRole[]) => boolean;
};

export function useSessionRoles(): SessionRoles {
  const [state, setState] = useState<Omit<SessionRoles, "is" | "isAny">>({
    loading: true, authed: false, userId: null, email: null, roles: [],
  });

  useEffect(() => {
    let unsub = () => {};
    async function load(session: any) {
      if (!session) {
        setState({ loading: false, authed: false, userId: null, email: null, roles: [] });
        return;
      }
      const { data } = await supabase.from("user_roles" as any).select("role").eq("user_id", session.user.id);
      const roles = ((data ?? []) as any[]).map((r) => r.role as AppRole);
      setState({
        loading: false, authed: true, userId: session.user.id,
        email: session.user.email ?? null, roles,
      });
    }
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => load(s));
    unsub = () => sub.subscription.unsubscribe();
    return () => unsub();
  }, []);

  return {
    ...state,
    is: (r) => state.roles.includes(r),
    isAny: (rs) => rs.some((r) => state.roles.includes(r)),
  };
}
