import { afterEach, describe, expect, it } from "vitest";

import {
  clearQueryCache,
  invalidateOrgQueries,
  queryCacheKey,
  readQueryCache,
  writeQueryCache,
} from "@/lib/ui/query-cache";

describe("query-cache", () => {
  afterEach(() => {
    clearQueryCache();
  });

  it("stores and reads entries within ttl", () => {
    const key = queryCacheKey("org-1", "projects");

    writeQueryCache(key, "org-1", [{ id: "p1" }]);

    expect(readQueryCache(key)).toEqual([{ id: "p1" }]);
  });

  it("invalidates entries for a single organization", () => {
    writeQueryCache(
      queryCacheKey("org-1", "projects"),
      "org-1",
      ["a"]
    );
    writeQueryCache(
      queryCacheKey("org-2", "projects"),
      "org-2",
      ["b"]
    );

    invalidateOrgQueries("org-1");

    expect(readQueryCache(queryCacheKey("org-1", "projects"))).toBeNull();
    expect(readQueryCache(queryCacheKey("org-2", "projects"))).toEqual(["b"]);
  });
});
