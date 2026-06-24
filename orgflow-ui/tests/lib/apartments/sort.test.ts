import { describe, expect, it } from "vitest";

import {
  compareApartmentNumbers,
  sortByApartmentNumber,
} from "@/lib/apartments/sort";

describe("apartment sort", () => {
  it("orders numeric apartment numbers ascending", () => {
    expect(
      ["10", "2", "1", "20", "3"].sort(compareApartmentNumbers)
    ).toEqual(["1", "2", "3", "10", "20"]);
  });

  it("sortByApartmentNumber sorts apartment rows", () => {
    const rows = sortByApartmentNumber([
      { apartment_number: "10", id: "a" },
      { apartment_number: "2", id: "b" },
      { apartment_number: "1", id: "c" },
    ]);

    expect(rows.map((row) => row.apartment_number)).toEqual(["1", "2", "10"]);
  });
});
