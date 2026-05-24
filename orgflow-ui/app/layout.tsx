import type { Metadata } from "next";

import "./globals.css";

import Sidebar from "./components/sidebar";

export const metadata: Metadata = {
  title: "OrgFlow",
  description: "AI Operations Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="he">

      <body
        className="
          bg-zinc-100
          dark:bg-zinc-950
        "
      >

        <div
          dir="rtl"
          className="flex"
        >

          <Sidebar />

          <main className="flex-1">
            {children}
          </main>

        </div>

      </body>

    </html>
  );
}