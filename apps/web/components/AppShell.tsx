"use client";

import { Crown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { mobileTabs } from "../lib/ui-data";

function isActive(pathname: string, href: string) {
  if (pathname === "/" && href === "/chat") return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <div className="phone-shell">
        <header className="phone-status">
          <div className="phone-brand">
            <span className="brand-mark"><Crown size={15} /></span>
            <span>Boardroom</span>
          </div>
          <div className="phone-context">CEO MODE</div>
        </header>
        <main className="main">{children}</main>
        <nav className="bottom-tabs" aria-label="Boardroom mobile navigation">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link className={`tab-link ${active ? "active" : ""}`} href={item.href} key={item.href}>
                <Icon size={20} />
                <span>{item.label}</span>
                {item.badge ? <span className="tab-badge">{item.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
