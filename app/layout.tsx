import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Greenscape Quote Agent",
  description:
    "Internal quote drafting tool for Greenscape Pro. Notes in, priced proposal out, Marcus reviews and sends.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-caliche-white text-saguaro-black">
        <Nav />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-6 md:px-8 py-10 md:py-14">
            {children}
          </div>
        </main>
        <footer className="border-t border-adobe">
          <div className="mx-auto max-w-7xl px-6 md:px-8 py-5 text-xs text-stone-gray flex items-center justify-between">
            <span>Greenscape Quote Agent · v0.1</span>
            <span className="tnum">Phoenix · {new Date().getFullYear()}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
