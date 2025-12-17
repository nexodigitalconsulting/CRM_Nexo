import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  Briefcase,
  Settings,
  ChevronDown,
  Package,
  CalendarDays,
  TrendingUp,
  Megaphone,
  Workflow,
  LogOut,
  BarChart3,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompanySettings } from "@/hooks/useCompanySettings";

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
  { label: "Análisis Productos", icon: BarChart3, href: "/product-analysis" },
  { label: "Flujos", icon: Workflow, href: "/flows" },
  { label: "Calendario", icon: CalendarDays, href: "/calendar" },
];

export function Sidebar() {
  const location = useLocation();
  const { user, signOut, isAdmin } = useAuth();
  const { data: companySettings } = useCompanySettings();
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

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          {companySettings?.logo_url ? (
            <img 
              src={companySettings.logo_url} 
              alt={companySettings.name || "Logo"} 
              className="h-9 w-9 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <span className="text-lg font-semibold text-sidebar-foreground">
            {companySettings?.name || "CRM Pro"}
          </span>
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
            <li>
              <Link
                to="/profile"
                className={cn(
                  "sidebar-item",
                  location.pathname === "/profile" && "sidebar-item-active"
                )}
              >
                <User className="h-5 w-5" />
                Mi Perfil
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link
                  to="/settings"
                  className={cn(
                    "sidebar-item",
                    location.pathname === "/settings" && "sidebar-item-active"
                  )}
                >
                  <Settings className="h-5 w-5" />
                  Configuración
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* User Section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {user?.email ? getInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'Administrador' : 'Usuario'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
