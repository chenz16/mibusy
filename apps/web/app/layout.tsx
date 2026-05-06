import "./globals.css";

import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "Solo Agent Platform",
  description: "Stage 1 agent control plane",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
