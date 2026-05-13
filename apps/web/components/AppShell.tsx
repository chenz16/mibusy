"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navGroups } from "../lib/ui-data";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-title">Mibusy</div>
          <div className="brand-subtitle">Virtual team HQ</div>
        </div>
        {navGroups.map((group) => (
          <nav className="nav-section" key={group.label} aria-label={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (pathname === "/" && item.href === "/chat");
              return (
                <Link className={`nav-item ${active ? "active" : ""}`} href={item.href} key={item.href}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {item.badge ? <small className="badge failed">{item.badge}</small> : null}
                </Link>
              );
            })}
          </nav>
        ))}
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
