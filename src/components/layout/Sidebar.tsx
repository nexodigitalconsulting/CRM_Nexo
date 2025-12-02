import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Receipt,
  Briefcase,
  Settings,
  ChevronDown,
  Package,
  CalendarDays,
  TrendingUp,
  Megaphone,
  Workflow,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: { label: string; href: string }[];
}

const navigation: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Campañas", icon: Megaphone, href: "/campaigns" },
  { label: "Contactos", icon: Users, href: "/contacts" },
  { label: "Clientes", icon: Building2, href: "/clients" },
  { label: "Servicios", icon: Package, href: "/services" },
  {
    label: "Comercial",
    icon: Briefcase,
    children: [
      { label: "Presupuestos", href: "/quotes" },
      { label: "Contratos", href: "/contracts" },
    ],
  },
  {
    label: "Facturación",
    icon: Receipt,
    children: [
      { label: "Facturas", href: "/invoices" },
      { label: "Remesas", href: "/remittances" },
      { label: "Gastos", href: "/expenses" },
    ],
  },
  { label: "Flujos", icon: Workflow, href: "/flows" },
  { label: "Calendario", icon: CalendarDays, href: "/calendar" },
];

const bottomNav: NavItem[] = [
  { label: "Configuración", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Comercial", "Facturación"]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href?: string, children?: { href: string }[]) => {
    if (href) return location.pathname === href;
    if (children) return children.some((child) => location.pathname === child.href);
    return false;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">CRM Pro</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        "sidebar-item w-full justify-between",
                        isActive(undefined, item.children) && "text-sidebar-foreground"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          expandedItems.includes(item.label) && "rotate-180"
                        )}
                      />
                    </button>
                    {expandedItems.includes(item.label) && (
                      <ul className="mt-1 ml-4 space-y-1 border-l border-sidebar-border pl-4">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              to={child.href}
                              className={cn(
                                "sidebar-item text-sm",
                                location.pathname === child.href && "sidebar-item-active"
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.href!}
                    className={cn(
                      "sidebar-item",
                      location.pathname === item.href && "sidebar-item-active"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-sidebar-border px-3 py-4">
          <ul className="space-y-1">
            {bottomNav.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href!}
                  className={cn(
                    "sidebar-item",
                    location.pathname === item.href && "sidebar-item-active"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
