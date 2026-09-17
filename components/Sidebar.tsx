"use client";

import {
  House,
  Target,
  Lightbulb,
  ListTodo,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  BookOpen,
  Users,
  UserRound,
  Settings,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { translations, type Language } from "@/lib/translations";

type SidebarProps = {
  language: Language;
};

export default function Sidebar({ language }: SidebarProps) {
  const router = useRouter();
  const t = translations[language];

  const scheduleLabel = language === "ru" ? "Расписание" : "Dienstplan";
  const materialsLabel = language === "ru" ? "Материалы" : "Materialien";

  const items = [
    {
      key: "goals",
      label: t.navigation.goals,
      icon: Target,
      path: "/goals",
    },
    {
      key: "ideas",
      label: t.navigation.ideas,
      icon: Lightbulb,
      path: "/ideas",
    },
    {
      key: "tasks",
      label: t.navigation.tasks,
      icon: ListTodo,
      path: "/tasks",
    },
    {
      key: "deadlines",
      label: t.navigation.deadlines,
      icon: CalendarClock,
      path: "/deadlines",
    },
    {
      key: "calendar",
      label: t.navigation.calendar,
      icon: CalendarDays,
      path: "/calendar",
    },
    {
      key: "schedule",
      label: scheduleLabel,
      icon: ClipboardList,
      path: "/schedule",
    },
    {
      key: "materials",
      label: materialsLabel,
      icon: BookOpen,
      path: "/materials",
    },
    {
      key: "team",
      label: t.navigation.team,
      icon: Users,
      path: "/team",
    },
    {
      key: "teens",
      label: t.navigation.teens,
      icon: UserRound,
      path: "/teens",
    },
  ];

  return (
    <aside className="group fixed left-0 top-0 z-50 flex h-screen w-[72px] flex-col border-r border-neutral-200 bg-white transition-all duration-300 hover:w-[240px]">
      {/* Home */}
      <div className="flex h-[64px] items-center justify-center border-b border-neutral-200 px-3">
        <button
          onClick={() => router.push("/")}
          title={t.navigation.dashboard}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-800"
        >
          <House size={19} strokeWidth={1.8} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => router.push(item.path)}
              title={item.label}
              className="flex h-11 w-full shrink-0 items-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
            >
              <span className="flex min-w-[48px] items-center justify-center">
                <Icon size={19} strokeWidth={1.8} />
              </span>

              <span className="overflow-hidden whitespace-nowrap text-sm font-medium text-neutral-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-neutral-200 px-3 py-4">
        <button
          title={language === "ru" ? "Настройки" : "Einstellungen"}
          className="flex h-11 w-full items-center rounded-xl text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
        >
          <span className="flex min-w-[48px] items-center justify-center">
            <Settings size={19} strokeWidth={1.8} />
          </span>

          <span className="overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {language === "ru" ? "Настройки" : "Einstellungen"}
          </span>
        </button>
      </div>
    </aside>
  );
}