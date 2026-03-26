import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/layout/DashboardLayout";

// Auth pages
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));

// Admin pages
const UserList = lazy(() => import("./pages/admin/UserList"));
const UserForm = lazy(() => import("./pages/admin/UserForm"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const ProfilePage = lazy(() => import("./pages/admin/ProfilePage"));

// Existing pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ComponentList = lazy(() => import("./pages/inventory/ComponentList"));
const ComponentForm = lazy(() => import("./pages/inventory/ComponentForm"));
const ComponentDetail = lazy(() => import("./pages/inventory/ComponentDetail"));
const BomList = lazy(() => import("./pages/inventory/BomList"));
const BomUpload = lazy(() => import("./pages/inventory/BomUpload"));
const BomDetail = lazy(() => import("./pages/inventory/BomDetail"));
const InvoiceHistory = lazy(() => import("./pages/inventory/InvoiceHistory"));
const InvoiceUpload = lazy(() => import("./pages/inventory/InvoiceUpload"));
const ToolList = lazy(() => import("./pages/tools/ToolList"));
const ToolForm = lazy(() => import("./pages/tools/ToolForm"));
const MaterialList = lazy(() => import("./pages/tools/MaterialList"));
const MaterialForm = lazy(() => import("./pages/tools/MaterialForm"));
const MachineList = lazy(() => import("./pages/machines/MachineList"));
const MachineDetail = lazy(() => import("./pages/machines/MachineDetail"));
const MachineForm = lazy(() => import("./pages/machines/MachineForm"));
const MaintenanceLog = lazy(() => import("./pages/machines/MaintenanceLog"));
const SoftwareList = lazy(() => import("./pages/software/SoftwareList"));
const SoftwareForm = lazy(() => import("./pages/software/SoftwareForm"));
const SubscriptionList = lazy(
  () => import("./pages/software/SubscriptionList")
);
const SubscriptionForm = lazy(
  () => import("./pages/software/SubscriptionForm")
);
const ProxmoxDashboard = lazy(
  () => import("./pages/proxmox/ProxmoxDashboard")
);
const NodeStatus = lazy(() => import("./pages/proxmox/NodeStatus"));
const ProxmoxSettings = lazy(
  () => import("./pages/proxmox/ProxmoxSettings")
);
const SupplierList = lazy(
  () => import("./pages/purchasing/SupplierList")
);
const SupplierForm = lazy(
  () => import("./pages/purchasing/SupplierForm")
);
const SupplierDetail = lazy(
  () => import("./pages/purchasing/SupplierDetail")
);
const ManufacturerList = lazy(
  () => import("./pages/purchasing/ManufacturerList")
);
const ManufacturerForm = lazy(
  () => import("./pages/purchasing/ManufacturerForm")
);
const ManufacturerDetail = lazy(
  () => import("./pages/purchasing/ManufacturerDetail")
);
const StockLocationList = lazy(
  () => import("./pages/stock/StockLocationList")
);
const StockLocationForm = lazy(
  () => import("./pages/stock/StockLocationForm")
);
const StockItemList = lazy(() => import("./pages/stock/StockItemList"));
const StockItemDetail = lazy(() => import("./pages/stock/StockItemDetail"));
const BuildOrderList = lazy(() => import("./pages/build/BuildOrderList"));
const BuildOrderForm = lazy(() => import("./pages/build/BuildOrderForm"));
const BuildOrderDetail = lazy(
  () => import("./pages/build/BuildOrderDetail")
);
const CategoryList = lazy(() => import("./pages/parts/CategoryList"));
const CategoryForm = lazy(() => import("./pages/parts/CategoryForm"));
const FootprintList = lazy(() => import("./pages/parts/FootprintList"));
const FootprintForm = lazy(() => import("./pages/parts/FootprintForm"));
const PnPConverter = lazy(() => import("./pages/tools/PnPConverter"));
const InteractiveBOM = lazy(() => import("./pages/tools/InteractiveBOM"));
const LabelMaker = lazy(() => import("./pages/tools/LabelMaker"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes (no layout) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected routes with DashboardLayout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<ComponentList />} />
          <Route path="/inventory/new" element={<ComponentForm />} />
          <Route path="/inventory/:id" element={<ComponentDetail />} />
          <Route path="/inventory/:id/edit" element={<ComponentForm />} />
          <Route path="/inventory/boms" element={<BomList />} />
          <Route path="/inventory/boms/upload" element={<BomUpload />} />
          <Route path="/inventory/boms/:id" element={<BomDetail />} />
          <Route path="/inventory/invoices" element={<InvoiceHistory />} />
          <Route
            path="/inventory/invoices/upload"
            element={<InvoiceUpload />}
          />
          <Route path="/tools" element={<ToolList />} />
          <Route path="/tools/new" element={<ToolForm />} />
          <Route path="/tools/:id/edit" element={<ToolForm />} />
          <Route path="/materials" element={<MaterialList />} />
          <Route path="/materials/new" element={<MaterialForm />} />
          <Route path="/materials/:id/edit" element={<MaterialForm />} />
          <Route path="/machines" element={<MachineList />} />
          <Route path="/machines/new" element={<MachineForm />} />
          <Route path="/machines/:id" element={<MachineDetail />} />
          <Route path="/machines/:id/edit" element={<MachineForm />} />
          <Route
            path="/machines/:id/maintenance"
            element={<MaintenanceLog />}
          />
          <Route path="/software" element={<SoftwareList />} />
          <Route path="/software/new" element={<SoftwareForm />} />
          <Route path="/software/:id/edit" element={<SoftwareForm />} />
          <Route path="/subscriptions" element={<SubscriptionList />} />
          <Route path="/subscriptions/new" element={<SubscriptionForm />} />
          <Route
            path="/subscriptions/:id/edit"
            element={<SubscriptionForm />}
          />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/suppliers/new" element={<SupplierForm />} />
          <Route path="/suppliers/:id" element={<SupplierDetail />} />
          <Route path="/suppliers/:id/edit" element={<SupplierForm />} />
          <Route path="/manufacturers" element={<ManufacturerList />} />
          <Route path="/manufacturers/new" element={<ManufacturerForm />} />
          <Route path="/manufacturers/:id" element={<ManufacturerDetail />} />
          <Route path="/manufacturers/:id/edit" element={<ManufacturerForm />} />
          <Route path="/stock-locations" element={<StockLocationList />} />
          <Route path="/stock-locations/new" element={<StockLocationForm />} />
          <Route path="/stock-locations/:id/edit" element={<StockLocationForm />} />
          <Route path="/stock" element={<StockItemList />} />
          <Route path="/stock/:id" element={<StockItemDetail />} />
          <Route path="/build-orders" element={<BuildOrderList />} />
          <Route path="/build-orders/new" element={<BuildOrderForm />} />
          <Route path="/build-orders/:id" element={<BuildOrderDetail />} />
          <Route path="/build-orders/:id/edit" element={<BuildOrderForm />} />
          <Route path="/categories" element={<CategoryList />} />
          <Route path="/categories/new" element={<CategoryForm />} />
          <Route path="/categories/:id/edit" element={<CategoryForm />} />
          <Route path="/footprints" element={<FootprintList />} />
          <Route path="/footprints/new" element={<FootprintForm />} />
          <Route path="/footprints/:id/edit" element={<FootprintForm />} />
          <Route path="/tools/pnp-converter" element={<PnPConverter />} />
          <Route path="/tools/interactive-bom" element={<InteractiveBOM />} />
          <Route path="/tools/label-maker" element={<LabelMaker />} />
          <Route path="/proxmox" element={<ProxmoxDashboard />} />
          <Route path="/proxmox/settings" element={<ProxmoxSettings />} />
          <Route path="/proxmox/:serverId" element={<NodeStatus />} />

          {/* Admin routes (role-protected) */}
          <Route path="/admin/users" element={<AdminRoute><UserList /></AdminRoute>} />
          <Route path="/admin/users/new" element={<AdminRoute><UserForm /></AdminRoute>} />
          <Route path="/admin/users/:id/edit" element={<AdminRoute><UserForm /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
          <Route path="/admin/audit-log" element={<AdminRoute><AuditLogPage /></AdminRoute>} />

          {/* Profile */}
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
