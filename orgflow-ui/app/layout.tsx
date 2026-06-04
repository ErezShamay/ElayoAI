import type { Metadata } from "next";

import { ELAYOAI_APP_NAME } from "@/lib/elayoai/keys";
import { Toaster } from "sonner";

import { AuthProvider } from "@/contexts/AuthContext";

import AuthGuard from "@/components/auth/AuthGuard";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import AppProviders from "@/providers/AppProviders";

import "./globals.css";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export const metadata: Metadata = {
  title: ELAYOAI_APP_NAME,
  description:
    "AI Operations Platform for Construction Management",
  manifest: "/manifest.webmanifest",
  applicationName: ELAYOAI_APP_NAME,
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (

    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
    >

      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="elayoai-theme",o="orgflow-theme";var s=localStorage.getItem(k);if(s===null){var l=localStorage.getItem(o);if(l!==null){localStorage.setItem(k,l);s=l;}}var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=s==="dark"||(s==="system"&&d);document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`,
          }}
        />
      </head>

      <body
        className="
          bg-[var(--of-color-surface-muted)]
          dark:bg-[var(--of-color-surface-muted)]
          text-[var(--of-color-text)]
          antialiased
        "
      >

        <AppProviders>
          <AuthProvider>
            <AuthGuard>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>

              <Toaster
                richColors
                position="top-left"
                closeButton
                style={{ zIndex: "var(--of-z-toast)" }}
              />
            </AuthGuard>
          </AuthProvider>
        </AppProviders>

      </body>

    </html>
  );
}