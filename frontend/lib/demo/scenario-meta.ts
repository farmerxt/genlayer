/**
 * Client-safe demo scenario metadata.
 *
 * Only static metadata — no node imports — so client components (DemoPicker)
 * can render the scenario list. The heavy builders (fs, child_process) live in
 * lib/demo/fixtures.ts and are only ever imported by server-side code.
 */

export interface DemoScenarioMeta {
  id: string;
  label: string;
  expected: "PASS" | "FAIL";
  tagline: string;
}

export const DEMO_SCENARIO_META: DemoScenarioMeta[] = [
  {
    id: "demo-fail",
    label: "Password Reset Implementation",
    expected: "FAIL",
    tagline: "Expired reset tokens are incorrectly accepted",
  },
  {
    id: "demo-pass",
    label: "Password Reset Implementation — Correct",
    expected: "PASS",
    tagline: "Expired tokens are properly rejected",
  },
  {
    id: "demo-research",
    label: "Research Deliverable",
    expected: "PASS",
    tagline: "Subjective research task adjudicated from evidence",
  },
];

export function getDemoScenarioMeta(id: string): DemoScenarioMeta | undefined {
  return DEMO_SCENARIO_META.find((s) => s.id === id);
}