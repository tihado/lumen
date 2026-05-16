import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumen",
  description:
    "Voice-first lesson authoring — grounded, editable teaching materials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full antialiased" lang="en">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
