import { supabase } from "@/integrations/supabase/client";

export type TableRow = {
  id: string;
  number: number;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: "square" | "circle";
  seats: number;
  label: string | null;
  occupied: boolean;
  occupied_name: string | null;
  occupied_since: string | null;
};

export type TextLabel = {
  id: string;
  x: number;
  y: number;
  text: string;
  font_size: number;
};

export type FloorSettings = {
  bg_image_url: string | null;
  bg_fit: "cover" | "contain";
  bg_zoom: number;
  bg_pos_x: number;
  bg_pos_y: number;
};

export async function fetchTables(): Promise<TableRow[]> {
  const { data, error } = await supabase.from("tables").select("*").order("number");
  if (error) throw error;
  return (data ?? []) as TableRow[];
}

export async function fetchLabels(): Promise<TextLabel[]> {
  const { data, error } = await supabase.from("text_labels").select("*");
  if (error) throw error;
  return (data ?? []) as TextLabel[];
}

export async function fetchSettings(): Promise<FloorSettings> {
  const { data } = await supabase
    .from("settings")
    .select("bg_image_url, bg_fit, bg_zoom, bg_pos_x, bg_pos_y" as any)
    .eq("id", 1)
    .maybeSingle();
  const d = (data ?? {}) as any;
  return {
    bg_image_url: d.bg_image_url ?? null,
    bg_fit: (d.bg_fit as "cover" | "contain") ?? "cover",
    bg_zoom: Number(d.bg_zoom ?? 100),
    bg_pos_x: Number(d.bg_pos_x ?? 50),
    bg_pos_y: Number(d.bg_pos_y ?? 50),
  };
}

export function bgStyle(s: FloorSettings): React.CSSProperties {
  if (!s.bg_image_url) return {};
  const size = s.bg_fit === "cover"
    ? `${Math.max(100, s.bg_zoom)}% auto`
    : `${Math.max(10, s.bg_zoom)}% auto`;
  return {
    backgroundImage: `url(${s.bg_image_url})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: s.bg_zoom === 100 && s.bg_fit === "cover" ? "cover" : s.bg_zoom === 100 && s.bg_fit === "contain" ? "contain" : size,
    backgroundPosition: `${s.bg_pos_x}% ${s.bg_pos_y}%`,
  };
}
