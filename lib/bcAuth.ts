import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/*
 * Вход подростков в Bibel-Challenge.
 * Подростки НЕ пользователи Supabase: пароль хранится в виде scrypt-хеша,
 * сессия — подписанный cookie. Секрет берётся из SUPABASE_SERVICE_ROLE_KEY,
 * отдельную переменную добавлять не нужно.
 */

const COOKIE = "bc_session";
const SESSION_SECONDS = 60 * 60 * 24 * 120;

function secret(): Buffer {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt.");
  return crypto.createHash("sha256").update("bc:" + k).digest();
}

const b64u = (b: Buffer) => b.toString("base64url");

export function signToken(payload: Record<string, unknown>, ttlSec: number): string {
  const body = b64u(
    Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec })),
  );
  const sig = b64u(crypto.createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken<T = Record<string, unknown>>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data as T;
  } catch {
    return null;
  }
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 32);
  return `s1$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [v, saltHex, keyHex] = (stored ?? "").split("$");
  if (v !== "s1" || !saltHex || !keyHex) return false;
  const key = Buffer.from(keyHex, "hex");
  const test = crypto.scryptSync(pw, Buffer.from(saltHex, "hex"), key.length);
  return test.length === key.length && crypto.timingSafeEqual(test, key);
}

export async function setSession(participantId: number) {
  const c = await cookies();
  c.set(COOKIE, signToken({ pid: participantId }, SESSION_SECONDS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSession() {
  const c = await cookies();
  c.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export type Participant = {
  id: number;
  teen_id: number | null;
  first_name: string;
  last_name: string;
  nickname: string;
  password_hash: string;
  lang: "de" | "ru";
  avatar_url: string | null;
  mentor_id: number | null;
  status: "active" | "blocked";
  hide_in_ranking: boolean;
  is_guest: boolean;
  onboarding_done: boolean;
};

/* Текущий подросток по cookie (или null) */
export async function getParticipant(): Promise<Participant | null> {
  const c = await cookies();
  const data = verifyToken<{ pid: number }>(c.get(COOKIE)?.value);
  if (!data?.pid) return null;
  const { data: row } = await getSupabaseAdmin()
    .from("bc_participants")
    .select("*")
    .eq("id", data.pid)
    .maybeSingle();
  if (!row || row.status !== "active") return null;
  return row as Participant;
}

/* Простейшая защита от перебора (в памяти сервера, этого достаточно для старта) */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n += 1;
  return h.n <= max;
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

export function cleanText(v: unknown, max = 60): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export const NICK_RE = /^[\p{L}\p{N}_.\-]{3,20}$/u;