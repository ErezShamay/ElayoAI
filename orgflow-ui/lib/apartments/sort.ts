export function compareApartmentNumbers(a: string, b: string): number {
  const aTrimmed = a.trim();
  const bTrimmed = b.trim();
  const aNumeric = /^\d+$/.test(aTrimmed);
  const bNumeric = /^\d+$/.test(bTrimmed);

  if (aNumeric && bNumeric) {
    return Number.parseInt(aTrimmed, 10) - Number.parseInt(bTrimmed, 10);
  }
  if (aNumeric) {
    return -1;
  }
  if (bNumeric) {
    return 1;
  }
  return aTrimmed.localeCompare(bTrimmed, "he");
}

export function sortByApartmentNumber<T extends { apartment_number: string }>(
  apartments: T[]
): T[] {
  return [...apartments].sort((left, right) =>
    compareApartmentNumbers(left.apartment_number, right.apartment_number)
  );
}
