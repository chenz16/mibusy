import "./globals.css";

import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "Mibusy Virtual Team",
  description: "Manager workspace for delegating work to a virtual AI team",
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
