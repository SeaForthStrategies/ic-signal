import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finding Winners Launch OS",
  description: "Interactive 60-day webinar launch command center for the Finding Winners campaign.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
