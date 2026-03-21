import { NavLink, useLocation } from "react-router-dom"
import {
  HomeIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  ServerIcon,
  WrenchIcon,
  CommandLineIcon,
  CreditCardIcon,
  ServerStackIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  ArchiveBoxIcon,
  QueueListIcon,
  FolderIcon,
  RectangleStackIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline"
import { useAuth } from "@/contexts/AuthContext"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  end?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: HomeIcon, end: true },
    ],
  },
  {
    title: "Inventory",
    items: [
      { to: "/inventory", label: "Components", icon: CpuChipIcon, end: true },
      { to: "/categories", label: "Categories", icon: FolderIcon, end: true },
      { to: "/footprints", label: "Footprints", icon: RectangleStackIcon, end: true },
      { to: "/inventory/boms", label: "BOMs", icon: ClipboardDocumentListIcon },
      { to: "/inventory/invoices", label: "Invoices", icon: DocumentTextIcon },
      { to: "/stock-locations", label: "Stock Locations", icon: MapPinIcon, end: true },
      { to: "/stock", label: "Stock Items", icon: ArchiveBoxIcon, end: true },
    ],
  },
  {
    title: "Manufacturing",
    items: [
      { to: "/build-orders", label: "Build Orders", icon: QueueListIcon, end: true },
    ],
  },
  {
    title: "Purchasing",
    items: [
      { to: "/suppliers", label: "Suppliers", icon: BuildingStorefrontIcon, end: true },
      { to: "/manufacturers", label: "Manufacturers", icon: BuildingOffice2Icon, end: true },
    ],
  },
  {
    title: "Lab",
    items: [
      { to: "/tools", label: "Tools", icon: WrenchScrewdriverIcon, end: true },
      { to: "/materials", label: "Materials", icon: CubeIcon, end: true },
    ],
  },
  {
    title: "Machines",
    items: [
      { to: "/machines", label: "All Machines", icon: ServerIcon, end: true },
    ],
  },
  {
    title: "Software",
    items: [
      { to: "/software", label: "Licenses", icon: CommandLineIcon, end: true },
      { to: "/subscriptions", label: "Subscriptions", icon: CreditCardIcon, end: true },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { to: "/proxmox", label: "Proxmox", icon: ServerStackIcon, end: true },
      { to: "/proxmox/settings", label: "Settings", icon: Cog6ToothIcon },
    ],
  },
]

const adminSection: NavSection = {
  title: "Admin",
  items: [
    { to: "/admin/users", label: "Users", icon: UsersIcon, end: true },
    { to: "/admin/settings", label: "Settings", icon: Cog6ToothIcon, end: true },
    { to: "/admin/audit-log", label: "Audit Log", icon: ClipboardDocumentCheckIcon, end: true },
  ],
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.end) {
    return pathname === item.to
  }
  return pathname === item.to || pathname.startsWith(item.to + "/")
}

export function AppSidebar() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  const allSections =
    user?.role === "admin" ? [...sections, adminSection] : sections

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <WrenchIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">
            HomeLab
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {allSections.map((section, idx) => (
          <div key={section.title}>
            {idx > 0 && <SidebarSeparator />}
            <SidebarGroup>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isItemActive(pathname, item)}
                        tooltip={item.label}
                      >
                        <NavLink to={item.to} end={item.end}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
