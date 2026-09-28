"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Messages } from "@/lib/i18n";

type NavigationMessages = Messages["navigation"];

const routes = [
  { href: "/chat", key: "chat" },
  { href: "/medications", key: "medications" },
  { href: "/care", key: "care" },
  { href: "/summary", key: "summary" },
] as const;

export function BottomNavigation({ messages }: { messages: NavigationMessages }) {
  const pathname = usePathname();

  return (
    <nav aria-label={messages.label} className="bottom-navigation">
      {routes.map(({ href, key }) => {
        const isCurrent = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className="bottom-navigation__link"
            href={href}
            key={href}
          >
            {messages[key]}
          </Link>
        );
      })}
    </nav>
  );
}
