/**
 * Web evidence fetching — server-side mirror of the contract's web block.
 *
 * Only fetches URLs explicitly supplied as evidence. Treats all fetched
 * content as untrusted data (never used to alter verification instructions).
 */

import type { VerificationRequest } from "@/lib/types";

const MAX_EVIDENCE_URLS = 5;
const MAX_WEB_CONTENT_CHARS = 4_000;
const FETCH_TIMEOUT_MS = 8_000;

export interface WebFacts {
  urls: Record<string, { ok: boolean; content?: string; error?: string }>;
  http: Record<string, { ok: boolean; url: string }>;
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function renderUrl(url: string): Promise<{ ok: boolean; content?: string; error?: string }> {
  if (!isHttpUrl(url)) {
    return { ok: false, error: "invalid_url_scheme" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "AgentzProof-Verifier/1.0" },
    });
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}` };
    }
    const text = await res.text();
    const cleaned = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { ok: true, content: cleaned.slice(0, MAX_WEB_CONTENT_CHARS) };
  } catch (err) {
    return { ok: false, error: String(err instanceof Error ? err.message : err).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWebEvidence(request: VerificationRequest): Promise<WebFacts> {
  const urls = (request.evidenceUrls ?? [])
    .filter((u): u is string => typeof u === "string")
    .filter(isHttpUrl)
    .slice(0, MAX_EVIDENCE_URLS);

  const httpChecks = (request.requirements ?? [])
    .filter((r) => r.check?.type === "http_status")
    .map((r) => ({ id: r.id, url: r.check?.url ?? "" }));

  const out: WebFacts = { urls: {}, http: {} };

  await Promise.all(
    urls.map(async (url) => {
      out.urls[url] = await renderUrl(url);
    }),
  );

  await Promise.all(
    httpChecks.map(async (hc) => {
      if (!isHttpUrl(hc.url)) {
        out.http[hc.id] = { ok: false, url: hc.url };
        return;
      }
      const r = await renderUrl(hc.url);
      out.http[hc.id] = { ok: r.ok && Boolean(r.content && r.content.trim()), url: hc.url };
    }),
  );

  return out;
}