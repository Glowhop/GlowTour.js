import type { ReactNode } from "react";
import "@glowhop/styles-tour/default.css";

export const metadata = {
  title: "GlowTour.js SSR (React / Next.js)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
