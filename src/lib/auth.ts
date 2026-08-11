// Auth: bcrypt password hash + JWT (24h) + simple IP rate limiting.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Vercel App-router style functions get (req, res) with node runtime.
export type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export async function parseJson<T>(req: IncomingMessage): Promise<T> {
  const body = await readBody(req);
  return JSON.parse(body || '{}') as T;
}

function json(res: ServerResponse, code: number, obj: unknown) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  const body = JSON.stringify(obj);
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

export function jsonResponse(res: ServerResponse, code: number, obj: unknown) {
  json(res, code, obj);
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

// Brute-force tripwire: per-IP failed attempts in a 60s window, max 5.
const attempts = new Map<string, number[]>();

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 60_000);
  attempts.set(ip, list);
  return list.length >= 5;
}

export function recordFailure(ip: string) {
  const now = Date.now();
  const list = attempts.get(ip) ?? [];
  list.push(now);
  attempts.set(ip, list.filter((t) => now - t < 60_000));
}

// bcryptjs, loaded lazily to avoid top-level import issues in edge.
let bcrypt: any;
let jwt: any;
async function load() {
  if (!bcrypt) bcrypt = require('bcryptjs');
  if (!jwt) jwt = require('jsonwebtoken');
}

export async function verifyPassword(plain: string, hash: string | undefined): Promise<boolean> {
  if (!hash) return false;
  await load();
  return bcrypt.compare(plain, hash);
}

export async function makeToken(): Promise<string> {
  await load();
  const secret = process.env.JWT_SECRET || 'dev-only-secret';
  return jwt.sign({ aud: 'gmbvault-dashboard', sub: 'owner' }, secret, {
    expiresIn: '24h',
    algorithm: 'HS256',
  });
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await load();
    const secret = process.env.JWT_SECRET || 'dev-only-secret';
    jwt.verify(token, secret, { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

export function getBearer(req: IncomingMessage): string | undefined {
  const h = req.headers['authorization'];
  if (!h) return undefined;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : undefined;
}

export function clientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  const vf = req.headers['x-vercel-forwarded-for'];
  if (typeof vf === 'string' && vf.length) return vf.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}
