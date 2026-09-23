"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  House,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/translations";

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/update-password",
];

export default function BottomNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  if (publicRoutes.includes(pathname)) {
    return null;
  }

  const t = translations[language];

  const items = [
    {
      href: "/",
      label: t.navigation.dashboard,
      icon: House,
    },
    {
      href: "/schedule",
      label: t.navigation.schedule,
      icon: CalendarRange,
    },
    {
      href: "/materials",
      label: t.navigation.materials,
      icon: BookOpen,
    },
    {
      href: "/calendar",
      label: t.navigation.calendar,
      icon: CalendarDays,
    },
  ];

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:hidden">
      <div className="mx-auto flex h-[72px] max-w-[430px] items-center rounded-[25px] border border-[#e0e3e6] bg-white/96 px-2 shadow-[0_8px_35px_rgba(17,24,32,0.13)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-full min-w-0 flex-1 items-center justify-center"
            >
              <div
                className={`flex min-w-[64px] flex-col items-center justify-center gap-1.5 rounded-[17px] px-2 py-2 transition ${
                  active
                    ? "bg-[#111820] text-white"
                    : "text-[#7a8490]"
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.3 : 2}
                />

                <span className="text-[10px] font-semibold leading-none">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}