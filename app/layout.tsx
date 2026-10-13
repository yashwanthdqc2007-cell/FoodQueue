import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "FoodQueue | AI Food Waste Intelligence & Redistribution",
  description:
    "AI-powered food waste intelligence, demand forecasting, and deterministic surplus redistribution platform.",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon.png", type: "image/png" },
    ],
    shortcut: "/brand/favicon.svg",
    apple: "/brand/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className="min-h-full font-sans antialiased bg-background text-foreground flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
