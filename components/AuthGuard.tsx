"use client";

import Image from "next/image";
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
          <div className="relative h-16 w-16">
  <Image
  src="/tlite-logo.png"
  alt="TLite"
  fill
  priority
  sizes="64px"
  className="object-contain"
/>
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