"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { supabase } from "@/lib/supabase";

/*
 * Напоминание «запиши, когда можешь служить в следующем месяце».
 *
 * Показывается в последние REMINDER_DAYS дней месяца (по умолчанию 10 —
 * примерно с конца предпоследней недели) и пока человек не ответил
 * на ВСЕ воскресенья следующего месяца.
 *
 * Чтобы изменить момент появления — поменяй REMINDER_DAYS.
 */
export const REMINDER_DAYS = 31;

export const AVAILABILITY_UPDATED_EVENT = "availability-updated";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function getSundaysOfMonth(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const result: string[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, monthIndex, day).getDay() === 0) {
      result.push(toDateString(new Date(year, monthIndex, day)));
    }
  }

  return result;
}

/* true, если сегодня уже «пора напомнить» */
export function isReminderWindow(now: Date = new Date()) {
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  return now.getDate() > daysInMonth - REMINDER_DAYS;
}

export function getNextMonth(now: Date = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function useAvailabilityReminder() {
  const [needed, setNeeded] = useState(false);
  const pathname = usePathname();

  const check = useCallback(async () => {
    const now = new Date();

    if (!isReminderWindow(now)) {
      setNeeded(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNeeded(false);
        return;
      }

      const sundays = getSundaysOfMonth(getNextMonth(now));

      if (sundays.length === 0) {
        setNeeded(false);
        return;
      }

      const { data, error } = await supabase
        .from("service_availability")
        .select("sunday_date")
        .eq("user_id", user.id)
        .gte("sunday_date", sundays[0])
        .lte("sunday_date", sundays[sundays.length - 1]);

      if (error) {
        /* таблицы ещё нет или нет доступа — молча ничего не показываем */
        setNeeded(false);
        return;
      }

      const answered = new Set((data ?? []).map((row) => row.sunday_date));

      setNeeded(sundays.some((date) => !answered.has(date)));
    } catch {
      setNeeded(false);
    }
  }, []);

  /* проверяем при открытии и при каждом переходе на другую страницу */
  useEffect(() => {
    check();
  }, [check, pathname]);

  /* и когда человек вошёл / вышел, или ответил в форме */
  useEffect(() => {
    window.addEventListener(AVAILABILITY_UPDATED_EVENT, check);

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      window.removeEventListener(AVAILABILITY_UPDATED_EVENT, check);
      authListener.subscription.unsubscribe();
    };
  }, [check]);

  return { needed, nextMonth: getNextMonth() };
}