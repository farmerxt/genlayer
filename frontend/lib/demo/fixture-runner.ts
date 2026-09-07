/**
 * Runs the controlled demo fixture test suite (server-side).
 *
 * The only command that may ever be executed is the demo fixture's own test
 * suite (a fixed, read-only script shipped in this repo). Arbitrary submitted
 * code is NEVER executed. The resulting exit code becomes the `reported`
 * deterministic fact for the "expired tokens rejected" requirement — exactly
 * the fact the on-chain contract ingests as ground truth.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

export interface FixtureTestResult {
  exitCode: number | null;
  output: string;
  ran: boolean;
}

const FIXTURES_ROOT = path.resolve(process.cwd(), "../fixtures");

export function fixtureDir(variant: "buggy" | "correct"): string {
  return path.join(FIXTURES_ROOT, `password-reset-${variant}`);
}

export function runFixtureTestSuite(variant: "buggy" | "correct"): FixtureTestResult {
  const dir = fixtureDir(variant);
  const res = spawnSync("python3", ["tests/test_password_reset.py"], {
    cwd: dir,
    timeout: 20_000,
    encoding: "utf-8",
  });
  if (
    res.error ||
    res.status === 9009 ||
    /python(?:3)? was not found|python(?:3)?.*not found|Microsoft Store/i.test(
      `${res.stdout ?? ""}\n${res.stderr ?? ""}`,
    )
  ) {
    return { exitCode: null, output: String(res.error?.message ?? "python3 unavailable"), ran: false };
  }
  return {
    exitCode: res.status ?? null,
    output: (res.stdout ?? "") + (res.stderr ?? ""),
    ran: true,
  };
}

/**
 * Deterministic fallback when python3 is unavailable: the buggy fixture's
 * expired-token test is known to fail (exit 1) and the correct fixture's
 * suite is known to pass (exit 0). Used only so the demo still works on
 * machines without Python.
 */
export function expectedExitCode(variant: "buggy" | "correct"): number {
  return variant === "buggy" ? 1 : 0;
}