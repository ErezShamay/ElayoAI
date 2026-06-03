import { apiFetch } from "@/lib/api/client";
import { listLinePhotosForLine } from "@/lib/field-reports/line-photo-store";

import type { LinePhotoData, PdfReportLine } from "./types";

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result || ""));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read image blob"));
    };
    reader.readAsDataURL(blob);
  });
}

async function fetchRemoteImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await apiFetch(url);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}

export async function resolveLinePhotos(
  reportId: string,
  lines: PdfReportLine[]
): Promise<LinePhotoData[]> {
  const photos: LinePhotoData[] = [];

  for (const line of lines) {
    const remotePhotos =
      line.photos?.length
        ? line.photos
        : line.photo_url
          ? [{ id: line.photo_ids?.[0] ?? "legacy", url: line.photo_url }]
          : [];

    const localPhotos = await listLinePhotosForLine(reportId, line.id);

    for (const local of localPhotos) {
      photos.push({
        lineId: line.id,
        photoId: local.photoId,
        dataUrl: await blobToDataUrl(local.blob),
      });
    }

    for (const remote of remotePhotos) {
      if (
        localPhotos.some((local) => local.photoId === remote.id)
      ) {
        continue;
      }

      const dataUrl = await fetchRemoteImageDataUrl(remote.url);
      if (dataUrl) {
        photos.push({
          lineId: line.id,
          photoId: remote.id,
          dataUrl,
        });
      }
    }
  }

  return photos;
}

export async function resolveLogoDataUrl(
  logoUrl: string | null | undefined
): Promise<string | null> {
  if (!logoUrl) {
    return null;
  }

  if (logoUrl.startsWith("data:")) {
    return logoUrl;
  }

  if (logoUrl.startsWith("/")) {
    return fetchRemoteImageDataUrl(logoUrl);
  }

  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      return null;
    }
    return blobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}
