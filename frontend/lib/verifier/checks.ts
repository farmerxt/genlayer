/**
 * Deterministic check engine.
 *
 * Mirrors contracts/AgentzProofVerifier.py `_execute_pure_check` exactly, so
 * demo-mode adjudication produces the same ground truth the on-chain contract
 * would compute. Checks are pure string/regex/function/file operations on the
 * submitted deliverable — byte-identical on every run.
 */

import type { CheckSpec, Deliverable } from "@/lib/types";

export interface CheckOutcome {
  status: "PASS" | "FAIL";
  reason: string;
  detail: string;
  check: CheckSpec & { detail?: string };
}

export function deliverableHaystack(deliverable: Deliverable): string {
  const parts: string[] = [deliverable.code ?? ""];
  for (const [path, content] of Object.entries(deliverable.files ?? {})) {
    if (typeof content === "string") {
      parts.push(`FILE: ${path}\n${content}`);
    }
  }
  return parts.join("\n");
}

export function executePureCheck(
  check: CheckSpec,
  haystack: string,
  files: Record<string, string>,
): CheckOutcome {
  const type = check.type;

  if (type === "string_present") {
    const needle = check.needle ?? "";
    const found = needle.length > 0 && haystack.includes(needle);
    return {
      status: found ? "PASS" : "FAIL",
      reason: found
        ? "Required content found in submitted deliverable."
        : "Required content missing from submitted deliverable.",
      detail: `needle=${JSON.stringify(needle)} found=${found}`,
      check: { ...check, detail: `needle=${JSON.stringify(needle)} found=${found}` },
    };
  }

  if (type === "regex") {
    let matched = false;
    try {
      matched = new RegExp(check.pattern ?? "").test(haystack);
    } catch {
      matched = false;
    }
    return {
      status: matched ? "PASS" : "FAIL",
      reason: matched
        ? "Pattern matched in submitted deliverable."
        : "Pattern did not match in submitted deliverable.",
      detail: `pattern=${JSON.stringify(check.pattern ?? "")} matched=${matched}`,
      check: { ...check, detail: `pattern matched=${matched}` },
    };
  }

  if (type === "function_exists") {
    const name = check.name ?? "";
    const found = new RegExp(`\\bdef\\s+${escapeRegExp(name)}\\s*\\(`).test(haystack);
    return {
      status: found ? "PASS" : "FAIL",
      reason: found
        ? "Required function is defined in submitted code."
        : "Required function is not defined in submitted code.",
      detail: `function=${JSON.stringify(name)} found=${found}`,
      check: { ...check, detail: `function found=${found}` },
    };
  }

  if (type === "file_exists") {
    const path = check.path ?? "";
    const present = path in files;
    return {
      status: present ? "PASS" : "FAIL",
      reason: present
        ? "Required file present in submission manifest."
        : "Required file missing from submission manifest.",
      detail: `path=${JSON.stringify(path)} present=${present}`,
      check: { ...check, detail: `path present=${present}` },
    };
  }

  if (type === "reported") {
    const passed = Boolean(check.passed);
    const evidenceNote = (check.evidence ?? "").slice(0, 200);
    return {
      status: passed ? "PASS" : "FAIL",
      reason: passed
        ? "Verifier-supplied evidence confirms requirement."
        : "Verifier-supplied evidence shows requirement not met.",
      detail: `reported=${passed} evidence=${JSON.stringify(evidenceNote)}`,
      check: { ...check, detail: `reported=${passed}` },
    };
  }

  return {
    status: "FAIL",
    reason: "Unknown deterministic check type; requirement treated as failed.",
    detail: `unknown check type: ${type}`,
    check,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}