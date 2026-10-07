import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoodQueue | AI Food Waste Intelligence & Redistribution",
  description:
    "AI-powered food waste intelligence, demand forecasting, and deterministic surplus redistribution platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full font-sans antialiased bg-background text-foreground flex flex-col">
        {children}
      </body>
    </html>
  );
}
