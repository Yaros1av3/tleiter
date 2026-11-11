import { PDFDocument, PDFFont, PDFPage, PDFString, rgb } from "pdf-lib";

/* ---------- данные, которые отдаёт /api/bc-admin/work?view=export ---------- */

export type ExportData = {
  season: { year: number; number: number; start_date: string; end_date: string };
  participants: { first_name: string; last_name: string }[];
  gifts: { first_name: string; last_name: string; link: string; price: number | null }[];
};

type Fonts = { regular: PDFFont; bold: PDFFont };

/* ---------- оформление ---------- */

const PAGE: [number, number] = [595.28, 841.89]; /* A4 */
const M = 56;
const INK = rgb(0.106, 0.141, 0.192);
const GREY = rgb(0.43, 0.42, 0.38);
const LINE = rgb(0.9, 0.88, 0.82);
const ZEBRA = rgb(0.985, 0.975, 0.945);
const SUN = rgb(1, 0.788, 0.235);
const BLUE = rgb(0.1, 0.3, 0.72);

const de = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const monthOf = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1] ?? "";
const euro = (n: number) =>
  `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/* ---------- простой «писатель» страниц ---------- */

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    readonly pdf: PDFDocument,
    readonly f: Fonts,
  ) {
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage(PAGE);
    this.y = PAGE[1] - M;
  }

  ensure(h: number) {
    if (this.y - h < M + 10) {
      this.newPage();
      return true;
    }
    return false;
  }

  /* перенос по словам; слишком длинные слова режем по символам */
  wrap(text: string, font: PDFFont, size: number, maxW: number) {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxW) {
        line = test;
        continue;
      }
      if (line) lines.push(line);
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxW) {
        let n = rest.length;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > maxW) n -= 1;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    if (line) lines.push(line);
    return lines;
  }

  fit(text: string, font: PDFFont, size: number, maxW: number) {
    if (font.widthOfTextAtSize(text, size) <= maxW) return text;
    let t = text;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxW) t = t.slice(0, -1);
    return `${t}…`;
  }

  paragraph(
    text: string,
    o: { font?: PDFFont; size?: number; gap?: number; indent?: number; bullet?: boolean; color?: ReturnType<typeof rgb> } = {},
  ) {
    const font = o.font ?? this.f.regular;
    const size = o.size ?? 11;
    const lead = size * 1.4;
    const indent = o.indent ?? 0;
    const width = PAGE[0] - 2 * M - indent;
    const lines = this.wrap(text, font, size, width);
    lines.forEach((line, i) => {
      this.ensure(lead);
      if (o.bullet && i === 0) {
        this.page.drawText("•", { x: M + indent - 12, y: this.y - size, size, font, color: INK });
      }
      this.page.drawText(line, { x: M + indent, y: this.y - size, size, font, color: o.color ?? INK });
      this.y -= lead;
    });
    this.y -= o.gap ?? 8;
  }

  /* «Метка: значение» в одной строке */
  field(label: string, value: string) {
    const size = 11.5;
    this.ensure(size * 1.6);
    this.page.drawText(label, { x: M, y: this.y - size, size, font: this.f.bold, color: INK });
    const w = this.f.bold.widthOfTextAtSize(`${label} `, size);
    this.page.drawText(value, { x: M + w, y: this.y - size, size, font: this.f.regular, color: INK });
    this.y -= size * 1.7;
  }

  link(page: PDFPage, url: string, x: number, y: number, w: number, h: number) {
    const ctx = this.pdf.context;
    const annot = ctx.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y, x + w, y + h],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    page.node.addAnnot(ctx.register(annot));
  }

  /* таблица: ячейка — текст или {text, url} */
  table(
    cols: { title: string; w: number; right?: boolean }[],
    rows: (string | { text: string; url: string })[][],
    foot?: (string | null)[],
  ) {
    const size = 10.5;
    const rowH = 24;
    const pad = 8;

    const header = () => {
      this.ensure(rowH * 2);
      let x = M;
      this.page.drawRectangle({ x: M, y: this.y - rowH, width: PAGE[0] - 2 * M, height: rowH, color: INK });
      for (const c of cols) {
        const tw = this.f.bold.widthOfTextAtSize(c.title, size);
        this.page.drawText(c.title, {
          x: c.right ? x + c.w - pad - tw : x + pad,
          y: this.y - rowH + 8,
          size,
          font: this.f.bold,
          color: rgb(1, 1, 1),
        });
        x += c.w;
      }
      this.y -= rowH;
    };

    const drawRow = (cells: (string | { text: string; url: string } | null)[], bold: boolean, zebra: boolean) => {
      if (this.ensure(rowH)) header();
      const page = this.page;
      if (zebra) page.drawRectangle({ x: M, y: this.y - rowH, width: PAGE[0] - 2 * M, height: rowH, color: ZEBRA });
      page.drawLine({
        start: { x: M, y: this.y - rowH },
        end: { x: PAGE[0] - M, y: this.y - rowH },
        thickness: 0.5,
        color: LINE,
      });
      let x = M;
      cols.forEach((c, i) => {
        const cell = cells[i];
        if (cell) {
          const isLink = typeof cell !== "string";
          const font = bold ? this.f.bold : this.f.regular;
          const text = this.fit(isLink ? cell.text : cell, font, size, c.w - pad * 2);
          const tw = font.widthOfTextAtSize(text, size);
          const tx = c.right ? x + c.w - pad - tw : x + pad;
          const ty = this.y - rowH + 8;
          page.drawText(text, { x: tx, y: ty, size, font, color: isLink ? BLUE : INK });
          if (isLink) {
            page.drawLine({ start: { x: tx, y: ty - 1.5 }, end: { x: tx + tw, y: ty - 1.5 }, thickness: 0.5, color: BLUE });
            this.link(page, cell.url, tx, ty - 3, tw, size + 4);
          }
        }
        x += c.w;
      });
      this.y -= rowH;
    };

    header();
    rows.forEach((r, i) => drawRow(r, false, i % 2 === 1));
    if (foot) drawRow(foot, true, false);
  }

  /* «Seite 1 из 2» внизу каждой страницы */
  footers(label: string) {
    const pages = this.pdf.getPages();
    pages.forEach((p, i) => {
      const t = `${label}  ·  Seite ${i + 1} / ${pages.length}`;
      const w = this.f.regular.widthOfTextAtSize(t, 8.5);
      p.drawText(t, { x: (PAGE[0] - w) / 2, y: 28, size: 8.5, font: this.f.regular, color: GREY });
    });
  }
}

/* ---------- PDF 1: описание и участники ---------- */

export function buildParticipantsPdf(pdf: PDFDocument, fonts: Fonts, data: ExportData) {
  const w = new Writer(pdf, fonts);
  const s = data.season;

  w.page.drawText("Bibel-Challenge", { x: M, y: w.y - 30, size: 30, font: fonts.bold, color: INK });
  w.y -= 42;
  w.page.drawRectangle({ x: M, y: w.y - 4, width: 64, height: 4, color: SUN });
  w.y -= 26;

  w.field("Veranstalter:", "Yaroslav Halaichuk und Diener des Teenie-Dienstes");
  w.field("Dauer der Challenge:", `${de(s.start_date)} – ${de(s.end_date)}`);
  w.y -= 12;

  w.paragraph("Beschreibung der Challenge", { font: fonts.bold, size: 15, gap: 8 });
  w.paragraph(
    "Der Bibel Challenge ist eine geistliche Initiative für Teenager mit dem Ziel, eine tägliche Gewohnheit des Bibellesens zu entwickeln und das persönliche geistliche Wachstum zu fördern.",
  );
  w.paragraph(
    "Während der Challenge liest jeder Teilnehmer einen Monat lang täglich ein Kapitel aus der Bibel. Nach dem Lesen sendet der Teenager eine kurze Rückmeldung oder einen Nachweis an seinen Begleiter, Mentor oder „Backleiter“, der ihn während der gesamten Zeit unterstützt und darauf achtet, dass das tägliche Lesen regelmäßig stattfindet.",
  );
  w.paragraph(
    "Für jedes gelesene und bestätigte Kapitel sammeln die Teilnehmer Punkte. Am Ende des Monats werden alle Punkte zusammengezählt. Teilnehmer, die die Challenge erfolgreich absolvieren, erhalten als Motivation und Anerkennung einen Preis im Wert von 20 Euro.",
  );
  w.paragraph("Das Hauptziel dieses Challenge ist es, Teenagern zu helfen:", { gap: 4 });
  [
    "eine beständige Gewohnheit des täglichen Bibellesens aufzubauen,",
    "geistlich zu wachsen,",
    "Gottes Wort besser kennenzulernen,",
    "persönliche Offenbarungen und Ermutigung durch die Bibel zu empfangen,",
    "sowie eine tiefere Beziehung zu Gott zu entwickeln.",
  ].forEach((t) => w.paragraph(t, { indent: 18, bullet: true, gap: 2 }));
  w.y -= 6;
  w.paragraph(
    "Wir glauben, dass das Wort Gottes Leben verändert und Teenagern Orientierung, Hoffnung und Kraft für den Alltag geben kann.",
    { gap: 16 },
  );

  w.ensure(24 * 3 + 30);
  w.paragraph("Teilnehmer:", { font: fonts.bold, size: 15, gap: 8 });
  w.table(
    [
      { title: "Nr.", w: 44 },
      { title: "Vorname", w: (PAGE[0] - 2 * M - 44) / 2 },
      { title: "Nachname", w: (PAGE[0] - 2 * M - 44) / 2 },
    ],
    data.participants.map((p, i) => [String(i + 1), p.first_name, p.last_name]),
  );

  w.footers("Bibel-Challenge");
}

/* ---------- PDF 2: подарки ---------- */

export function buildGiftsPdf(pdf: PDFDocument, fonts: Fonts, data: ExportData) {
  const w = new Writer(pdf, fonts);
  const s = data.season;

  w.page.drawText("Geschenke", { x: M, y: w.y - 30, size: 30, font: fonts.bold, color: INK });
  w.y -= 42;
  w.page.drawRectangle({ x: M, y: w.y - 4, width: 64, height: 4, color: SUN });
  w.y -= 26;

  w.field("Bibel-Challenge", "");
  w.field("Monat:", monthOf(s.start_date));
  w.field("Saison:", String(s.number));
  w.field("Jahr:", String(s.year));
  w.y -= 14;

  const total = data.gifts.reduce((n, g) => n + (g.price ?? 0), 0);
  const hasPrice = data.gifts.some((g) => g.price != null);
  const inner = PAGE[0] - 2 * M;

  w.table(
    [
      { title: "Name", w: 170 },
      { title: "Amazon-Link", w: inner - 170 - 80 },
      { title: "Preis", w: 80, right: true },
    ],
    data.gifts.map((g) => [
      `${g.first_name} ${g.last_name}`.trim(),
      { text: g.link, url: g.link },
      g.price != null ? euro(g.price) : "–",
    ]),
    hasPrice ? ["Gesamt", null, euro(total)] : undefined,
  );

  w.footers("Bibel-Challenge · Geschenke");
}

/* ---------- скачивание в браузере ---------- */

async function embedFonts(pdf: PDFDocument): Promise<Fonts> {
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  pdf.registerFontkit(fontkit);
  const [r, b] = await Promise.all(
    ["/fonts/Carlito-Regular.ttf", "/fonts/Carlito-Bold.ttf"].map(async (u) => {
      const res = await fetch(u);
      if (!res.ok) throw new Error(`font ${u}`);
      return res.arrayBuffer();
    }),
  );
  return {
    regular: await pdf.embedFont(r, { subset: true }),
    bold: await pdf.embedFont(b, { subset: true }),
  };
}

function download(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const fileBase = (s: ExportData["season"]) => `Bibel-Challenge_${monthOf(s.start_date)}-${s.year}`;

export async function downloadParticipantsPdf(data: ExportData) {
  const pdf = await PDFDocument.create();
  buildParticipantsPdf(pdf, await embedFonts(pdf), data);
  download(await pdf.save(), `${fileBase(data.season)}_Beschreibung-Teilnehmer.pdf`);
}

export async function downloadGiftsPdf(data: ExportData) {
  const pdf = await PDFDocument.create();
  buildGiftsPdf(pdf, await embedFonts(pdf), data);
  download(await pdf.save(), `${fileBase(data.season)}_Geschenke.pdf`);
}