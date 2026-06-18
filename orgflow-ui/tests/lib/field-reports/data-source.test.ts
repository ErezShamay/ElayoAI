import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FIELD_REPORTS_PING_PATH,
  fieldReportDataSourceModeLabelHe,
  pingFieldReportsApi,
  resolveFieldReportDataSource,
} from "@/lib/field-reports/data-source";

describe("field-report data-source (FR-010)", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolveFieldReportDataSource returns local-only only when navigator is offline", () => {
    expect(
      resolveFieldReportDataSource({
        navigatorOnline: false,
        apiReachable: true,
      }).mode
    ).toBe("local-only");

    const apiDownOnline = resolveFieldReportDataSource({
      navigatorOnline: true,
      apiReachable: false,
    });
    expect(apiDownOnline.mode).toBe("remote");
    expect(apiDownOnline.useLocalCatalog).toBe(false);
    expect(apiDownOnline.canCallVisitReportApi).toBe(true);

    const localOnly = resolveFieldReportDataSource(
      {
        navigatorOnline: false,
        apiReachable: false,
      },
      { offlinePrepActive: true }
    );
    expect(localOnly.useLocalCatalog).toBe(true);
    expect(localOnly.canCallVisitReportApi).toBe(false);
  });

  it("useLocalCatalog requires offline prep active and no network", () => {
    const withoutPrep = resolveFieldReportDataSource(
      { navigatorOnline: false, apiReachable: false },
      { offlinePrepActive: false }
    );
    expect(withoutPrep.useLocalCatalog).toBe(false);

    const withPrep = resolveFieldReportDataSource(
      { navigatorOnline: false, apiReachable: false },
      { offlinePrepActive: true }
    );
    expect(withPrep.useLocalCatalog).toBe(true);
  });

  it("resolveFieldReportDataSource returns hybrid when online and local report exists", () => {
    const hybrid = resolveFieldReportDataSource(
      { navigatorOnline: true, apiReachable: true },
      { hasLocalReport: true, serverReportId: "server-1" }
    );

    expect(hybrid.mode).toBe("hybrid");
    expect(hybrid.useLocalReports).toBe(true);
    expect(hybrid.useLocalCatalog).toBe(false);
    expect(hybrid.canCallVisitReportApi).toBe(true);
  });

  it("hybrid without server id cannot call visit API", () => {
    const hybrid = resolveFieldReportDataSource(
      { navigatorOnline: true, apiReachable: true },
      { hasLocalReport: true }
    );

    expect(hybrid.mode).toBe("hybrid");
    expect(hybrid.canCallVisitReportApi).toBe(false);
  });

  it("resolveFieldReportDataSource returns remote when online without local copy", () => {
    const remote = resolveFieldReportDataSource({
      navigatorOnline: true,
      apiReachable: true,
    });

    expect(remote.mode).toBe("remote");
    expect(remote.useLocalReports).toBe(false);
    expect(remote.canCallVisitReportApi).toBe(true);
  });

  it("fieldReportDataSourceModeLabelHe returns Hebrew labels", () => {
    expect(fieldReportDataSourceModeLabelHe("local-only")).toContain("אופליין");
    expect(fieldReportDataSourceModeLabelHe("hybrid")).toContain("מקומי");
    expect(fieldReportDataSourceModeLabelHe("remote")).toContain("מקוון");
  });

  it("pingFieldReportsApi returns false when navigator is offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await pingFieldReportsApi()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pingFieldReportsApi returns true when module-status responds ok", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true } as Response);

    expect(await pingFieldReportsApi({ request })).toBe(true);
    expect(request).toHaveBeenCalled();
    expect(request.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it("pingFieldReportsApi returns false on failed response", async () => {
    const request = vi.fn().mockResolvedValue({ ok: false } as Response);

    expect(await pingFieldReportsApi({ request })).toBe(false);
  });

  it("pingFieldReportsApi aborts after timeout", async () => {
    vi.useFakeTimers();

    const request = vi.fn(
      (signal: AbortSignal) =>
        new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    const pingPromise = pingFieldReportsApi({ timeoutMs: 50, request });
    await vi.advanceTimersByTimeAsync(50);
    await expect(pingPromise).resolves.toBe(false);

    vi.useRealTimers();
  });
});
