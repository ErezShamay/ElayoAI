import type { MetadataRoute } from "next";

import { ELAYOAI_APP_NAME } from "@/lib/elayoai/keys";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ELAYOAI_APP_NAME,
    short_name: ELAYOAI_APP_NAME,
    description: "דוחות שטח ועריכה במצב רשת/אופליין",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#07748d",
    lang: "he",
    dir: "rtl",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
