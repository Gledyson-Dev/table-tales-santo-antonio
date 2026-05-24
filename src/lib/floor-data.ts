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

export async function fetchTables(): Promise<TableRow[]> {
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .order("number");
  if (error) throw error;
  return (data ?? []) as TableRow[];
}

export async function fetchLabels(): Promise<TextLabel[]> {
  const { data, error } = await supabase.from("text_labels").select("*");
  if (error) throw error;
  return (data ?? []) as TextLabel[];
}
