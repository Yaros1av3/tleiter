import "server-only";
import { createClient } from "@supabase/supabase-js";

/*
 * ВНИМАНИЕ: этот клиент использует service role key и обходит RLS.
 * Импортировать только из серверного кода (API routes),
 * никогда из "use client" компонентов.
 */

const supabaseUrl = "https://ohdzqnniagnvwryvghbk.supabase.co";

export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt (Server-Umgebungsvariable fehlt).",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}