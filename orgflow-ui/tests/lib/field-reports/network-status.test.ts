import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canRunFieldReportSync,
  DEFAULT_FIELD_REPORT_NETWORK_POLL_MS,
  FIELD_REPORTS_PING_PATH,
  fieldReportNetworkStatusLabelHe,
  pingFieldReportsApi,
  probeFieldReportNetworkStatus,
  resolveFieldReportConnectivity,
  subscribeFieldReportNetworkStatus,
} from "@/lib/field-reports/sync/network-status";

describe("field-report network-status (FR-026)", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("resolveFieldReportConnectivity distinguishes offline, captive, and online", () => {
    expect(
      resolveFieldReportConnectivity({
        navigatorOnline: false,
        apiReachable: false,
      })
    ).toBe("offline");

    expect(
      resolveFieldReportConnectivity({
        navigatorOnline: true,
        apiReachable: false,
      })
    ).toBe("captive");

    expect(
      resolveFieldReportConnectivity({
        navigatorOnline: true,
        apiReachable: true,
      })
    ).toBe("online");
  });

  it("canRunFieldReportSync requires navigator online and API reachable", () => {
    expect(
      canRunFieldReportSync({
        navigatorOnline: true,
        apiReachable: true,
      })
    ).toBe(true);

    expect(
      canRunFieldReportSync({
        navigatorOnline: true,
        apiReachable: false,
      })
    ).toBe(false);
  });

  it("pingFieldReportsApi returns false when navigator is offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const request = vi.fn();

    expect(await pingFieldReportsApi({ request })).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it("pingFieldReportsApi returns true when module-status responds ok", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true } as Response);

    expect(await pingFieldReportsApi({ request })).toBe(true);
    expect(request).toHaveBeenCalled();
  });

  it("probeFieldReportNetworkStatus skips ping when navigator offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const request = vi.fn();

    const snapshot = await probeFieldReportNetworkStatus({ request });

    expect(snapshot).toEqual({
      navigatorOnline: false,
      apiReachable: false,
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("probeFieldReportNetworkStatus sets apiReachable from ping", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    expect(await probeFieldReportNetworkStatus({ request })).toEqual({
      navigatorOnline: true,
      apiReachable: false,
    });

    expect(await probeFieldReportNetworkStatus({ request })).toEqual({
      navigatorOnline: true,
      apiReachable: true,
    });
  });

  it("subscribeFieldReportNetworkStatus polls and reacts to online event", async () => {
    vi.useFakeTimers();

    const eventTarget = new EventTarget();
    vi.stubGlobal("window", {
      addEventListener: (
        type: string,
        handler: EventListenerOrEventListenerObject
      ) => {
        eventTarget.addEventListener(type, handler);
      },
      removeEventListener: (
        type: string,
        handler: EventListenerOrEventListenerObject
      ) => {
        eventTarget.removeEventListener(type, handler);
      },
      dispatchEvent: (event: Event) => eventTarget.dispatchEvent(event),
      setInterval: (handler: () => void, ms: number) =>
        setInterval(handler, ms),
      clearInterval: (id: ReturnType<typeof setInterval>) =>
        clearInterval(id),
    });

    const request = vi
      .fn()
      .mockResolvedValue({ ok: true } as Response);
    const listener = vi.fn();

    const unsubscribe = subscribeFieldReportNetworkStatus(listener, {
      request,
      pollIntervalMs: 1000,
    });

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalled();
    });

    listener.mockClear();
    vi.stubGlobal("navigator", { onLine: false });

    eventTarget.dispatchEvent(new Event("offline"));
    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith({
        navigatorOnline: false,
        apiReachable: false,
      });
    });

    listener.mockClear();
    vi.stubGlobal("navigator", { onLine: true });
    request.mockResolvedValue({ ok: true } as Response);

    eventTarget.dispatchEvent(new Event("online"));
    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith({
        navigatorOnline: true,
        apiReachable: true,
      });
    });

    listener.mockClear();
    await vi.advanceTimersByTimeAsync(1000);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    await vi.advanceTimersByTimeAsync(2000);
    expect(listener).not.toHaveBeenCalled();
  });

  it("fieldReportNetworkStatusLabelHe returns Hebrew labels", () => {
    expect(fieldReportNetworkStatusLabelHe("offline")).toContain("רשת");
    expect(fieldReportNetworkStatusLabelHe("captive")).toContain("שרת");
    expect(fieldReportNetworkStatusLabelHe("online")).toContain("מחובר");
  });

  it("exports ping path constant for module-status", () => {
    expect(FIELD_REPORTS_PING_PATH).toBe("/field-reports/module-status");
    expect(DEFAULT_FIELD_REPORT_NETWORK_POLL_MS).toBeGreaterThan(0);
  });
});
