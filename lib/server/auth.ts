import { cookies } from "next/headers";
import { getDb } from "./d1";

const COOKIE_NAME = "pippi_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const PBKDF2_ITERATIONS = 210_000;
const encoder = new TextEncoder();

type UserRow = { id: number; pager_number: string; password_hash: string; password_salt: string };
type SessionRow = { pager_number: string };

export class AuthError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function randomToken(size = 32) {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(size)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function derivePassword(password: string, salt: Uint8Array<ArrayBuffer>) {
  const encoded = encoder.encode(password);
  const passwordBuffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
  const key = await crypto.subtle.importKey("raw", passwordBuffer, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function hashToken(token: string) {
  const encoded = encoder.encode(token);
  const tokenBuffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
  return bytesToBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", tokenBuffer)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function validateCredentials(input: unknown) {
  if (!input || typeof input !== "object") throw new AuthError("INVALID REQUEST");
  const { number, password } = input as Record<string, unknown>;
  if (typeof number !== "string" || !/^\d{7}$/.test(number)) throw new AuthError("ENTER 7 DIGITS");
  if (typeof password !== "string" || password.length === 0 || password.length > 256) {
    throw new AuthError("ENTER PASSWORD");
  }
  return { number, password };
}

async function setSession(userId: number) {
  const db = await getDb();
  const token = randomToken();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await hashToken(token), userId, expiresAt).run();
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function register(input: unknown) {
  const { number, password } = validateCredentials(input);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await derivePassword(password, salt);
  try {
    await (await getDb()).prepare(
      "INSERT INTO users (pager_number, password_hash, password_salt) VALUES (?, ?, ?)",
    ).bind(number, bytesToBase64(passwordHash), bytesToBase64(salt)).run();
  } catch (error) {
    if (error instanceof Error && /unique|constraint/i.test(error.message)) throw new AuthError("IN USE", 409);
    throw error;
  }
}

export async function login(input: unknown) {
  const { number, password } = validateCredentials(input);
  const user = await (await getDb()).prepare(
    "SELECT id, pager_number, password_hash, password_salt FROM users WHERE pager_number = ?",
  ).bind(number).first<UserRow>();
  if (!user) throw new AuthError("CHECK NUMBER / PASSWORD", 401);
  const candidate = await derivePassword(password, base64ToBytes(user.password_salt));
  if (!constantTimeEqual(candidate, base64ToBytes(user.password_hash))) {
    throw new AuthError("CHECK NUMBER / PASSWORD", 401);
  }
  await setSession(user.id);
  return { number: user.pager_number };
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await (await getDb()).prepare(
    `SELECT users.pager_number FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
  ).bind(await hashToken(token), Math.floor(Date.now() / 1000)).first<SessionRow>();
  return session ? { number: session.pager_number } : null;
}

export async function logout() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await (await getDb()).prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await hashToken(token)).run();
  }
  store.set(COOKIE_NAME, "", {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0,
  });
}

export async function numberIsAvailable(number: string) {
  if (!/^\d{7}$/.test(number)) throw new AuthError("ENTER 7 DIGITS");
  const row = await (await getDb()).prepare("SELECT 1 AS found FROM users WHERE pager_number = ?")
    .bind(number).first<{ found: number }>();
  return !row;
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Authentication request failed", error);
  return Response.json({ error: "SYSTEM ERROR — TRY AGAIN" }, { status: 500 });
}
