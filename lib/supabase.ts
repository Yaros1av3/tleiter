import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ohdzqnniagnvwryvghbk.supabase.co";

const supabasePublishableKey =
  "sb_publishable_7vO3_QVsAVMfaNa5W99zZA_sir1Wl1X";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);