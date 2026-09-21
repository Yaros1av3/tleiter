"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthGuardProps = {
  children: ReactNode;
};

const publicRoutes = ["/login", "/register"];

export default function AuthGuard({
  children,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session && !publicRoutes.includes(pathname)) {
        router.replace("/login");
        return;
      }

      if (
        session &&
        publicRoutes.includes(pathname)
      ) {
        router.replace("/");
        return;
      }

      setChecking(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session && !publicRoutes.includes(pathname)) {
          router.replace("/login");
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f6] px-6">
        <div className="flex flex-col items-center">
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#111820]">
            <span className="text-2xl font-bold text-white">
              T
            </span>

            <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-yellow-400" />
          </div>

          <div className="mt-4 text-sm font-medium text-[#687585]">
            TLite
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}