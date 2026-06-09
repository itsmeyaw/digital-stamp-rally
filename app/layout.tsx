import type { Metadata } from "next";
import { Space_Grotesk, Archivo_Black } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// Heavy display face for signage-style headings. Ships a single weight (400/900-look).
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stamp Rally",
  description: "Collect stamps and complete your card.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${archivoBlack.variable} h-screen antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <div className="app-frame mx-auto w-full max-w-app flex flex-col flex-1">{children}</div>
      </body>
    </html>
  );
}
