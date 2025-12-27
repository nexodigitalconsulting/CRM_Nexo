import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  Briefcase,
  Settings,
  Package,
  CalendarDays,
  TrendingUp,
  Megaphone,
  Workflow,
  LogOut,
  BarChart3,
  User,
  FileText,
  CreditCard,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    ],
  },
  {
    label: "CRM",
    items: [
      { label: "Campañas", icon: Megaphone, href: "/campaigns" },
      { label: "Contactos", icon: Users, href: "/contacts" },
      { label: "Clientes", icon: Building2, href: "/clients" },
      { label: "Servicios", icon: Package, href: "/services" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Presupuestos", icon: FileText, href: "/quotes" },
      { label: "Contratos", icon: Briefcase, href: "/contracts" },
    ],
  },
  {
    label: "Facturación",
    items: [
      { label: "Facturas", icon: Receipt, href: "/invoices" },
      { label: "Remesas", icon: CreditCard, href: "/remittances" },
      { label: "Gastos", icon: Wallet, href: "/expenses" },
    ],
  },
  {
    label: "Análisis & Herramientas",
    items: [
      { label: "Análisis Productos", icon: BarChart3, href: "/product-analysis" },
      { label: "Flujos", icon: Workflow, href: "/flows" },
      { label: "Calendario", icon: CalendarDays, href: "/calendar" },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut, isAdmin } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (href: string) => location.pathname === href;

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header con logo y botón toggle */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-14 items-center gap-3 px-2">
          {companySettings?.logo_url ? (
            <img 
              src={companySettings.logo_url} 
              alt={companySettings.name || "Logo"} 
              className="h-8 w-8 rounded-lg object-contain shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
              <TrendingUp className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
          )}
          <span className={cn(
            "text-base font-semibold text-sidebar-foreground truncate transition-opacity duration-200",
            isCollapsed && "opacity-0"
          )}>
            {companySettings?.name || "CRM Pro"}
          </span>
          <SidebarTrigger className={cn(
            "ml-auto h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent hidden md:flex",
            isCollapsed && "ml-0"
          )} />
        </div>
      </SidebarHeader>

      {/* Navegación principal */}
      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-muted">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                    >
                      <Link to={item.href} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      {/* Navegación inferior: Perfil y Configuración */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/profile")}
                tooltip="Mi Perfil"
              >
                <Link to="/profile" onClick={handleNavClick}>
                  <User className="h-4 w-4" />
                  <span>Mi Perfil</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/settings")}
                  tooltip="Configuración"
                >
                  <Link to="/settings" onClick={handleNavClick}>
                    <Settings className="h-4 w-4" />
                    <span>Configuración</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Footer con usuario */}
      <SidebarFooter className="border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 py-2 px-1",
          isCollapsed && "justify-center"
        )}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs">
              {user?.email ? getInitials(user.email) : 'U'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-sidebar-muted">
                  {isAdmin ? 'Administrador' : 'Usuario'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8 mx-auto text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>

      {/* Rail para resize en desktop */}
      <SidebarRail />
    </Sidebar>
  );
}
