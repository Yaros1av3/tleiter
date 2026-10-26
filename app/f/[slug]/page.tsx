import type { Metadata } from "next";

import PublicForm from "@/components/PublicForm";
import { loadFormBySlug } from "@/lib/formsServer";
import { formatEventDate } from "@/lib/forms";

type Props = { params: Promise<{ slug: string }> };

/* Красивое превью ссылки в WhatsApp / Telegram: название и дата */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const form = await loadFormBySlug(slug).catch(() => null);

  if (!form) {
    return { title: "TLight", robots: { index: false, follow: false } };
  }

  const title = [form.title_de, form.title_ru].filter(Boolean).join(" · ") || "TLight";
  const when = [formatEventDate(form.event_date, "de"), form.event_time, form.location]
    .filter(Boolean)
    .join(" · ");

  return {
    title,
    description: when || undefined,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${form.emoji} ${title}`,
      description: when || undefined,
      type: "website",
    },
  };
}

export default async function PublicFormPage({ params }: Props) {
  const { slug } = await params;
  return <PublicForm slug={slug} />;
}
