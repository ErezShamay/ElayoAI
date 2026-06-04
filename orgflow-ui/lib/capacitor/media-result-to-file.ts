export type LinePhotoMediaResult = {
  webPath?: string;
  metadata?: { format?: string };
};

/**
 * המרת תוצאת Camera (webPath) ל-File לשמירה ב-blobs / העלאה.
 * עובד ב-WebView (capacitor://) ובדפדפן.
 */
export async function linePhotoMediaResultToFile(
  result: LinePhotoMediaResult,
  options: { defaultBaseName?: string } = {}
): Promise<File> {
  const webPath = result.webPath?.trim();
  if (!webPath) {
    throw new Error("לא התקבלה תמונה מהמצלמה");
  }

  const response = await fetch(webPath);
  if (!response.ok) {
    throw new Error("לא הצלחנו לקרוא את התמונה שנלכדה");
  }

  const blob = await response.blob();
  const format = normalizeImageFormat(result.metadata?.format);
  const mimeType =
    blob.type && blob.type.startsWith("image/")
      ? blob.type
      : `image/${format}`;
  const baseName = options.defaultBaseName ?? `line-photo-${Date.now()}`;
  const fileName = `${baseName}.${format === "jpeg" ? "jpg" : format}`;

  return new File([blob], fileName, { type: mimeType });
}

function normalizeImageFormat(format: string | undefined): string {
  const normalized = (format ?? "jpeg").toLowerCase().replace("jpg", "jpeg");
  if (normalized === "jpeg" || normalized === "png" || normalized === "webp") {
    return normalized;
  }

  return "jpeg";
}
