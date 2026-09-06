/**
 * Verification persistence.
 *
 * Production uses Upstash Redis over its serverless-friendly REST API when
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are configured. Local
 * development retains the existing in-memory/JSON-file fallback.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { Verification } from "@/lib/types";

export interface VerificationPersistence {
  get(id: string): Promise<Verification | undefined>;
  put(verification: Verification): Promise<void>;
  list(): Promise<Verification[]>;
}

class LocalPersistence implements VerificationPersistence {
  private items = new Map<string, Verification>();
  private readonly filePath: string | null;

  constructor(file?: string) {
    this.filePath = file ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), file) : null;
    this.load();
  }

  private load(): void {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf-8")) as Verification[];
      for (const verification of parsed) this.items.set(verification.id, verification);
    } catch {
      this.items.clear();
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(Array.from(this.items.values()), null, 2), "utf-8");
    } catch {
      // Local persistence is best-effort for development.
    }
  }

  async get(id: string): Promise<Verification | undefined> {
    return this.items.get(id);
  }

  async put(verification: Verification): Promise<void> {
    this.items.set(verification.id, verification);
    this.persist();
  }

  async list(): Promise<Verification[]> {
    return Array.from(this.items.values());
  }
}

class UpstashPersistence implements VerificationPersistence {
  private readonly url: string;
  private readonly token: string;
  private readonly indexKey = "agentzproof:verifications";
  private readonly recordPrefix = "agentzproof:verification:";

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
  }

  private async command<T = unknown>(parts: string[]): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parts),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Upstash persistence request failed (${response.status}).`);
    }
    const payload = (await response.json()) as { result?: T; error?: string };
    if (payload.error) throw new Error(`Upstash persistence error: ${payload.error}`);
    return payload.result as T;
  }

  async get(id: string): Promise<Verification | undefined> {
    const raw = await this.command<string | null>(["GET", `${this.recordPrefix}${id}`]);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Verification;
    } catch {
      throw new Error("Stored verification record is invalid JSON.");
    }
  }

  async put(verification: Verification): Promise<void> {
    await this.command(["SET", `${this.recordPrefix}${verification.id}`, JSON.stringify(verification)]);
    await this.command(["SADD", this.indexKey, verification.id]);
  }

  async list(): Promise<Verification[]> {
    const ids = await this.command<string[]>(["SMEMBERS", this.indexKey]);
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const records = await Promise.all(ids.map((id) => this.get(String(id))));
    return records.filter((record): record is Verification => Boolean(record));
  }
}

function createPersistence(): VerificationPersistence {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url || token) {
    if (!url || !token) {
      throw new Error("Both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required.");
    }
    return new UpstashPersistence(url, token);
  }
  return new LocalPersistence(process.env.DATA_FILE);
}

export class VerificationStore {
  constructor(private readonly persistence: VerificationPersistence = createPersistence()) {}

  async create(verification: Verification): Promise<Verification> {
    await this.persistence.put(verification);
    return verification;
  }

  async get(id: string): Promise<Verification | undefined> {
    return this.persistence.get(id);
  }

  async list(): Promise<Verification[]> {
    return (await this.persistence.list()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async update(id: string, patch: Partial<Verification>): Promise<Verification | undefined> {
    const existing = await this.persistence.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    await this.persistence.put(updated);
    return updated;
  }

  async upsert(verification: Verification): Promise<Verification> {
    await this.persistence.put(verification);
    return verification;
  }

  async count(): Promise<number> {
    return (await this.persistence.list()).length;
  }
}

export const verificationStore = new VerificationStore();
