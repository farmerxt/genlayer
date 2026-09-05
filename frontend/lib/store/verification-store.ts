/**
 * Verification store — MVP persistence.
 *
 * In-memory Map + optional JSON file persistence (DATA_FILE env var).
 * Sufficient for a hackathon MVP and for a single-instance deployment; swap
 * for a real database in production (the data model is documented in README).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { Verification } from "@/lib/types";

class VerificationStore {
  private items = new Map<string, Verification>();
  private filePath: string | null = null;

  constructor() {
    const file = process.env.DATA_FILE;
    if (file) {
      this.filePath = path.resolve(process.cwd(), file);
      this.load();
    }
  }

  private load(): void {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf-8")) as Verification[];
      for (const v of parsed) this.items.set(v.id, v);
    } catch {
      // Corrupt store file — start empty rather than crash.
      this.items.clear();
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(
        this.filePath,
        JSON.stringify(Array.from(this.items.values()), null, 2),
        "utf-8",
      );
    } catch {
      // Persistence is best-effort for the MVP.
    }
  }

  create(verification: Verification): Verification {
    this.items.set(verification.id, verification);
    this.persist();
    return verification;
  }

  get(id: string): Verification | undefined {
    return this.items.get(id);
  }

  list(): Verification[] {
    return Array.from(this.items.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  update(id: string, patch: Partial<Verification>): Verification | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    this.items.set(id, updated);
    this.persist();
    return updated;
  }

  upsert(verification: Verification): Verification {
    this.items.set(verification.id, verification);
    this.persist();
    return verification;
  }

  count(): number {
    return this.items.size;
  }
}

// Module-level singleton — Next.js route handlers share it per process.
export const verificationStore = new VerificationStore();