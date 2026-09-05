import { describe, expect, it } from "vitest";
import { getDemoScenario, DEMO_SCENARIOS } from "@/lib/demo/fixtures";
import { runVerificationEngine } from "@/lib/verifier/engine";

describe("demo scenarios full walkthrough", () => {
  it("has exactly 3 scenarios with expected outcomes", () => {
    expect(DEMO_SCENARIOS.length).toBe(3);
    expect(DEMO_SCENARIOS.map(s => s.id)).toEqual(["demo-fail", "demo-pass", "demo-research"]);
    expect(DEMO_SCENARIOS.map(s => s.expected)).toEqual(["FAIL", "PASS", "PASS"]);
  });

  it("Scenario 1 (demo-fail): executes and produces FAIL", async () => {
    const scenario = getDemoScenario("demo-fail")!;
    const request = await scenario.buildRequest();
    const result = await runVerificationEngine(request, { verificationId: "test-scenario-fail", mode: "demo" });
    expect(result.decision).toBe("FAIL");
    const req6 = result.requirements.find(r => r.id === "REQ-6");
    expect(req6?.status).toBe("FAIL");
  });

  it("Scenario 2 (demo-pass): executes and produces PASS", async () => {
    const scenario = getDemoScenario("demo-pass")!;
    const request = await scenario.buildRequest();
    const result = await runVerificationEngine(request, { verificationId: "test-scenario-pass", mode: "demo" });
    expect(result.decision).toBe("PASS");
    expect(result.requirements.every(r => r.status === "PASS")).toBe(true);
  });

  it("Scenario 3 (demo-research): executes and produces PASS", async () => {
    const scenario = getDemoScenario("demo-research")!;
    const request = await scenario.buildRequest();
    const result = await runVerificationEngine(request, { verificationId: "test-scenario-research", mode: "demo" });
    expect(result.decision).toBe("PASS");
    expect(result.requirements.every(r => r.status === "PASS")).toBe(true);
  });
});
