import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Supervisor AI",
  description:
    "שליטה ובקרה לפרויקטים",
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
    >

      <body>
        {children}
      </body>

    </html>
  );
}