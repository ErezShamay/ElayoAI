import { describe, expect, it } from "vitest";

import {
  canResidentAccessRoute,
  isResidentAllowedRoute,
  residentDeniedRouteRedirect,
} from "@/lib/auth/resident-route-guard";

describe("resident route guard", () => {
  it("allows residents only on portal and auth routes", () => {
    expect(isResidentAllowedRoute("/my-apartment")).toBe(true);
    expect(isResidentAllowedRoute("/auth/set-password")).toBe(true);
    expect(isResidentAllowedRoute("/portfolio")).toBe(false);
  });

  it("blocks residents from staff routes", () => {
    expect(canResidentAccessRoute("RESIDENT", "/projects")).toBe(false);
    expect(canResidentAccessRoute("SUPERVISOR", "/projects")).toBe(true);
  });

  it("redirects residents to personal area", () => {
    expect(residentDeniedRouteRedirect()).toBe("/my-apartment");
  });
});
