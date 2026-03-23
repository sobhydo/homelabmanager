import { useLocation, useNavigate } from "react-router-dom";
import {
  BellIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/inventory": "Components",
  "/inventory/new": "New Component",
  "/inventory/boms": "Bill of Materials",
  "/inventory/boms/upload": "Upload BOM",
  "/inventory/invoices": "Invoice History",
  "/inventory/invoices/upload": "Upload Invoice",
  "/tools": "Tools",
  "/tools/new": "New Tool",
  "/materials": "Materials",
  "/materials/new": "New Material",
  "/machines": "Machines",
  "/machines/new": "New Machine",
  "/software": "Software Licenses",
  "/software/new": "New License",
  "/subscriptions": "Subscriptions",
  "/subscriptions/new": "New Subscription",
  "/proxmox": "Proxmox",
  "/proxmox/settings": "Proxmox Settings",
  "/stock-locations": "Stock Locations",
  "/stock-locations/new": "New Stock Location",
  "/stock": "Stock Items",
  "/build-orders": "Build Orders",
  "/build-orders/new": "New Build Order",
  "/categories": "Part Categories",
  "/categories/new": "New Category",
  "/footprints": "Footprints",
  "/footprints/new": "New Footprint",
  "/suppliers": "Suppliers",
  "/suppliers/new": "New Supplier",
  "/manufacturers": "Manufacturers",
  "/manufacturers/new": "New Manufacturer",
  "/admin/users": "User Management",
  "/admin/users/new": "New User",
  "/admin/settings": "System Settings",
  "/admin/audit-log": "Audit Log",
  "/tools/pnp-converter": "Pick & Place Converter",
  "/tools/interactive-bom": "Interactive BOM Viewer",
  "/profile": "My Profile",
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  if (pathname.match(/^\/inventory\/\d+\/edit$/)) return "Edit Component";
  if (pathname.match(/^\/inventory\/\d+$/)) return "Component Detail";
  if (pathname.match(/^\/inventory\/boms\/\d+$/)) return "BOM Detail";
  if (pathname.match(/^\/tools\/\d+\/edit$/)) return "Edit Tool";
  if (pathname.match(/^\/materials\/\d+\/edit$/)) return "Edit Material";
  if (pathname.match(/^\/machines\/\d+\/edit$/)) return "Edit Machine";
  if (pathname.match(/^\/machines\/\d+\/maintenance$/)) return "Maintenance Log";
  if (pathname.match(/^\/machines\/\d+$/)) return "Machine Detail";
  if (pathname.match(/^\/software\/\d+\/edit$/)) return "Edit License";
  if (pathname.match(/^\/subscriptions\/\d+\/edit$/)) return "Edit Subscription";
  if (pathname.match(/^\/proxmox\/\d+$/)) return "Node Status";
  if (pathname.match(/^\/stock-locations\/\d+\/edit$/)) return "Edit Stock Location";
  if (pathname.match(/^\/stock\/\d+$/)) return "Stock Item Detail";
  if (pathname.match(/^\/build-orders\/\d+\/edit$/)) return "Edit Build Order";
  if (pathname.match(/^\/build-orders\/\d+$/)) return "Build Order Detail";
  if (pathname.match(/^\/categories\/\d+\/edit$/)) return "Edit Category";
  if (pathname.match(/^\/footprints\/\d+\/edit$/)) return "Edit Footprint";
  if (pathname.match(/^\/suppliers\/\d+/)) return "Supplier Detail";
  if (pathname.match(/^\/manufacturers\/\d+/)) return "Manufacturer Detail";
  if (pathname.match(/^\/admin\/users\/\d+\/edit$/)) return "Edit User";
  return "HomeLab Manager";
}

export default function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const title = getPageTitle(pathname);

  const initials = user
    ? (user.full_name || user.username)
        .split(" ")
        .map((s) => s.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("")
    : "U";

  return (
    <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-sm border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        <h1 className="text-sm font-medium">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150">
          <BellIcon className="h-4 w-4" />
        </button>

        <Separator orientation="vertical" className="!h-5 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors duration-150 focus:outline-none">
              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-primary">
                  {initials}
                </span>
              </div>
              <span className="text-sm hidden sm:block">
                {user?.full_name || user?.username || "User"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user?.full_name || user?.username || "User"}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {user?.email || `@${user?.username}`}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => navigate("/profile")}
            >
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              Profile
            </DropdownMenuItem>
            {user?.role === "admin" && (
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => navigate("/admin/settings")}
              >
                <Cog6ToothIcon className="h-4 w-4 text-muted-foreground" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                {theme === "dark" ? (
                  <MoonIcon className="h-4 w-4 text-muted-foreground" />
                ) : theme === "light" ? (
                  <SunIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ComputerDesktopIcon className="h-4 w-4 text-muted-foreground" />
                )}
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => setTheme("light")}
                >
                  <SunIcon className="h-4 w-4" />
                  Light
                  {theme === "light" && <span className="ml-auto text-xs text-primary">Active</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => setTheme("dark")}
                >
                  <MoonIcon className="h-4 w-4" />
                  Dark
                  {theme === "dark" && <span className="ml-auto text-xs text-primary">Active</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => setTheme("system")}
                >
                  <ComputerDesktopIcon className="h-4 w-4" />
                  System
                  {theme === "system" && <span className="ml-auto text-xs text-primary">Active</span>}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onClick={logout}
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
