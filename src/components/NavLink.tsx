"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps {
  to: string;
  className?: string;
  activeClassName?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, to, ...props }, ref) => {
    const pathname = usePathname();
    const href = to as string;
    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
