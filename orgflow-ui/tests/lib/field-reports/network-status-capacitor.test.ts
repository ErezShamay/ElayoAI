import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "android"),
  },
}));

const getStatus = vi.fn();
const addListener = vi.fn();

vi.mock("@capacitor/network", () => ({
  Network: {
    getStatus,
    addListener,
  },
}));

describe("field-report network-status + Capacitor (FR-033)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    getStatus.mockResolvedValue({ connected: true });
    addListener.mockResolvedValue({ remove: vi.fn() });

    const { resetCapacitorFieldReportNetworkForTests } = await import(
      "@/lib/capacitor/field-report-network"
    );
    resetCapacitorFieldReportNetworkForTests();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.useRealTimers();

    const { resetCapacitorFieldReportNetworkForTests } = await import(
      "@/lib/capacitor/field-report-network"
    );
    resetCapacitorFieldReportNetworkForTests();
  });

  it("probeFieldReportNetworkStatus uses Capacitor connected flag", async () => {
    getStatus.mockResolvedValue({ connected: false });

    const { probeFieldReportNetworkStatus } = await import(
      "@/lib/field-reports/sync/network-status"
    );

    const request = vi.fn();
    const snapshot = await probeFieldReportNetworkStatus({ request });

    expect(snapshot).toEqual({
      navigatorOnline: false,
      apiReachable: false,
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("subscribeFieldReportNetworkStatus reacts to Capacitor networkStatusChange", async () => {
    vi.useFakeTimers();

    let changeHandler: ((status: { connected: boolean }) => void) | undefined;
    addListener.mockImplementation(async (_event, handler) => {
      changeHandler = handler;
      return { remove: vi.fn() };
    });

    getStatus.mockResolvedValue({ connected: true });

    vi.stubGlobal("window", {
      setInterval: (handler: () => void, ms: number) =>
        setInterval(handler, ms),
      clearInterval: (id: ReturnType<typeof setInterval>) =>
        clearInterval(id),
    });

    const { subscribeFieldReportNetworkStatus } = await import(
      "@/lib/field-reports/sync/network-status"
    );

    const request = vi
      .fn()
      .mockResolvedValue({ ok: true } as Response);
    const listener = vi.fn();

    const unsubscribe = subscribeFieldReportNetworkStatus(listener, {
      request,
      pollIntervalMs: 60_000,
    });

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith({
        navigatorOnline: true,
        apiReachable: true,
      });
    });

    listener.mockClear();
    getStatus.mockResolvedValue({ connected: false });
    changeHandler?.({ connected: false });

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith({
        navigatorOnline: false,
        apiReachable: false,
      });
    });

    unsubscribe();
  });
});
