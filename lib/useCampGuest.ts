"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/* true, если вошедший — гость лагеря (без доступа к остальному приложению) */
export function useCampGuest() {
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.rpc("is_camp_guest").then(({ data }) => {
      if (alive) setIsGuest(data === true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return isGuest;
}