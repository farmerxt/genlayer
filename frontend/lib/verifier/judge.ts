/**
 * Local adjudication judge (DEMO MODE).
 *
 * When the GenLayer contract is not deployed/configured, the app adjudicates
 * subjective requirements with this deterministic rule-based judge. It is
 * intentionally simple and transparent: it measures how well the submitted
 * deliverable + evidence cover the requirement's key terms, mirroring the
 * *structure* of the on-chain LLM adjudication (ground truth first, verdicts
 * for subjective requirements only, stable PASS/FAIL output).
 *
 * The UI always labels this "simulated adjudication (demo mode)" — it is NOT
 * an on-chain consensus result. Deploy the contract (see genlayer/README.md)
 * and set GENLAYER_* env vars to get real Equivalence-Principle consensus.
 */

import type { RequirementSpec, VerificationRequest } from "@/lib/types";

export interface JudgeVerdicts {
  verdicts: Record<string, "PASS" | "FAIL">;
  note: string;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "with",
  "is", "are", "be", "was", "were", "can", "must", "should", "will", "that",
  "this", "these", "those", "it", "its", "by", "from", "at", "as", "their",
  "there", "has", "have", "had", "not", "no", "you", "your", "we", "our",
  "user", "users", "agent", "agents", "system", "they", "them", "all", "any",
  "summarize", "summarise", "explain", "describe", "provide", "please",
  "outline", "identify", "define", "include", "implement", "implementation",
]);

const SIGNAL_WORDS = new Set(["statistic", "statistics", "data", "pricing", "price", "cost", "revenue"]);

function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return token.slice(0, -3);
  if (token.length > 3 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOPWORDS.has(t));
}

function buildCorpus(request: VerificationRequest, webContent: string): string {
  const parts: string[] = [];
  const deliv = request.deliverable ?? {};
  if (deliv.summary) parts.push(deliv.summary.toLowerCase());
  if (deliv.code) parts.push(deliv.code.toLowerCase());
  for (const content of Object.values(deliv.files ?? {})) {
    if (typeof content === "string") parts.push(content.toLowerCase());
  }
  for (const item of request.evidence ?? []) {
    if (item.source) parts.push(item.source.toLowerCase());
    if (item.claim) parts.push(item.claim.toLowerCase());
    if (item.content) parts.push(item.content.toLowerCase());
  }
  if (webContent) parts.push(webContent.toLowerCase());
  return parts.join("\n");
}

function hasStatisticSignal(requirement: string, corpus: string): boolean {
  const reqLower = requirement.toLowerCase();
  const wantsNumbers =
    significantTokens(reqLower).some((t) => SIGNAL_WORDS.has(stem(t))) ||
    /\d+%|\$\d+|usd|\b\d+(\.\d+)?\s*(percent|million|billion)\b/i.test(requirement);
  if (!wantsNumbers) return false;
  return /\d+%|\$\d+/.test(corpus);
}

export function judgeSubjective(
  request: VerificationRequest,
  subjective: RequirementSpec[],
  webContent: string,
): JudgeVerdicts {
  if (subjective.length === 0) {
    return { verdicts: {}, note: "no_subjective_requirements" };
  }
  const corpus = buildCorpus(request, webContent);
  if (!corpus.trim()) {
    const verdicts: Record<string, "PASS" | "FAIL"> = {};
    for (const r of subjective) verdicts[r.id] = "FAIL";
    return { verdicts, note: "empty_corpus" };
  }

  const verdicts: Record<string, "PASS" | "FAIL"> = {};
  for (const r of subjective) {
    const tokens = significantTokens(r.text);
    if (tokens.length === 0) {
      verdicts[r.id] = "PASS"; // no meaningful claim to verify
      continue;
    }

    const stems = tokens.map(stem);
    let matched = stems.filter((s) => corpus.includes(s)).length;

    // Phrases: any 2+ word sequence from the requirement found in the corpus.
    const words = r.text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (words[i].length > 2 && phrase.length > 5 && corpus.includes(phrase)) {
        matched += 0.5;
        break;
      }
    }

    // Statistic/pricing support: requirement asks for data, corpus has it.
    if (hasStatisticSignal(r.text, corpus)) matched += 1;

    const ratio = matched / stems.length;
    const pass = ratio >= 0.5 || (matched >= 2 && ratio >= 0.34);
    verdicts[r.id] = pass ? "PASS" : "FAIL";
  }
  return { verdicts, note: "local_rule_judge" };
}