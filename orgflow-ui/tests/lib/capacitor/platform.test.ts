import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getCapacitorPlatform,
  isCapacitorAndroid,
  isCapacitorNativePlatform,
} from "@/lib/capacitor/platform";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
  },
}));

describe("capacitor platform (FR-029)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reports web when not native", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");

    expect(isCapacitorNativePlatform()).toBe(false);
    expect(getCapacitorPlatform()).toBe("web");
    expect(isCapacitorAndroid()).toBe(false);
  });

  it("reports android on native Android WebView", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");

    expect(isCapacitorNativePlatform()).toBe(true);
    expect(getCapacitorPlatform()).toBe("android");
    expect(isCapacitorAndroid()).toBe(true);
  });
});
