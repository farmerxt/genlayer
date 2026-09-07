import { afterEach, describe, expect, it, vi } from "vitest";
import { recoverInterruptedDeployment } from "./deploy-browser";

const STATE_KEY = "agentzproof.bradbury.deploymentState";
const wallet = "0x1111111111111111111111111111111111111111";

function installBrowserState(state: unknown, confirmResult = true) {
  const values = new Map<string, string>([[STATE_KEY, JSON.stringify(state)]]);
  const providerRequest = vi.fn();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
      confirm: vi.fn(() => confirmResult),
      ethereum: { request: providerRequest },
    },
  });
  return { values, providerRequest };
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "window");
});

describe("manual interrupted deployment recovery", () => {
  it("records a RECOVERED audit state without calling a provider", () => {
    const { values, providerRequest } = installBrowserState({
      status: "SUBMITTING",
      wallet,
      startedAt: "2026-09-06T05:01:49.470Z",
    });

    const result = recoverInterruptedDeployment();
    const persisted = JSON.parse(values.get(STATE_KEY)!);

    expect(result.status).toBe("RECOVERED");
    expect(result.wallet).toBe(wallet);
    expect(result.reason).toBe(
      "manual recovery after provider submission failed before transaction hash",
    );
    expect(persisted).toMatchObject({
      status: "RECOVERED",
      wallet,
      startedAt: "2026-09-06T05:01:49.470Z",
      recoveryAudit: {
        previousStatus: "SUBMITTING",
        wallet,
        startedAt: "2026-09-06T05:01:49.470Z",
        reason: "manual recovery after provider submission failed before transaction hash",
      },
    });
    expect(persisted.recoveredAt).toBe(persisted.recoveryAudit.recoveryTimestamp);
    expect(providerRequest).not.toHaveBeenCalled();
  });

  it("leaves the stale state unchanged when confirmation is declined", () => {
    const originalState = {
      status: "SUBMITTING",
      wallet,
      startedAt: "2026-09-06T05:01:49.470Z",
    };
    const { values, providerRequest } = installBrowserState(originalState, false);

    expect(() => recoverInterruptedDeployment()).toThrow("cancelled");
    expect(JSON.parse(values.get(STATE_KEY)!)).toEqual(originalState);
    expect(providerRequest).not.toHaveBeenCalled();
  });

  it("refuses recovery if a transaction hash is present", () => {
    const { values, providerRequest } = installBrowserState({
      status: "SUBMITTING",
      wallet,
      startedAt: "2026-09-06T05:01:49.470Z",
      transactionHash: `0x${"a".repeat(64)}`,
    });

    expect(() => recoverInterruptedDeployment()).toThrow("contains a transaction hash");
    expect(JSON.parse(values.get(STATE_KEY)!)).toMatchObject({ status: "SUBMITTING" });
    expect(providerRequest).not.toHaveBeenCalled();
  });

  it("allows recovery only from SUBMITTING", () => {
    const { providerRequest } = installBrowserState({
      status: "PENDING",
      wallet,
      submittedAt: "2026-09-06T05:01:49.470Z",
      transactionHash: `0x${"a".repeat(64)}`,
    });

    expect(() => recoverInterruptedDeployment()).toThrow("only allowed for SUBMITTING");
    expect(providerRequest).not.toHaveBeenCalled();
  });
});
