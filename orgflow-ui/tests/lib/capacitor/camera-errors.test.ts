import { describe, expect, it } from "vitest";

import {
  CAPACITOR_CAMERA_CANCELLED_CODE,
  isCapacitorCameraUserCancelled,
} from "@/lib/capacitor/camera-errors";

describe("capacitor camera-errors (FR-031)", () => {
  it("treats structured cancel code as user cancelled", () => {
    expect(
      isCapacitorCameraUserCancelled({
        code: CAPACITOR_CAMERA_CANCELLED_CODE,
        message: "Couldn't take photo",
      })
    ).toBe(true);
  });

  it("treats cancel message as user cancelled", () => {
    expect(
      isCapacitorCameraUserCancelled({ message: "User cancelled photos app" })
    ).toBe(true);
  });

  it("does not treat permission errors as cancel", () => {
    expect(
      isCapacitorCameraUserCancelled({
        code: "OS-PLUG-CAMR-0003",
        message: "Couldn't access camera",
      })
    ).toBe(false);
  });
});
