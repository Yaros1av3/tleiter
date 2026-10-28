"use client";

import {
  Cake,
  Clapperboard,
  Flame,
  Gamepad2,
  Heart,
  Music,
  PartyPopper,
  Pizza,
  Sun,
  Tent,
  Trophy,
  TreePine,
  type LucideIcon,
} from "lucide-react";

/* Значки мероприятий: обычные линейные иконки вместо смайликов */
const ICONS: Record<string, LucideIcon> = {
  party: PartyPopper,
  cake: Cake,
  camp: Tent,
  games: Gamepad2,
  food: Pizza,
  sport: Trophy,
  tree: TreePine,
  heart: Heart,
  movie: Clapperboard,
  sun: Sun,
  music: Music,
  fire: Flame,
};

export default function EventIcon({
  name,
  size = 24,
  className = "",
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
}) {
  // старые значения (смайлики) и пустые показываем как «праздник»
  const Icon = ICONS[name ?? ""] ?? PartyPopper;
  return <Icon size={size} strokeWidth={1.9} className={className} aria-hidden="true" />;
}