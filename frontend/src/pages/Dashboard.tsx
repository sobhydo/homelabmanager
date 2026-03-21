import { Link } from "react-router-dom";
import {
  CpuChipIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useDashboardSummary } from "../api/dashboard";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";


interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor: string;
  href?: string;
  alert?: boolean;
}

function StatCard({ title, value, icon: Icon, iconColor, href, alert }: StatCardProps) {
  const inner = (
    <Card className="group relative hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-semibold tracking-tight">{value}</p>
            <p className="text-[13px] text-muted-foreground mt-1">{title}</p>
          </div>
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconColor} transition-transform duration-200 group-hover:scale-110`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {alert && Number(value) > 0 && (
          <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link to={href}>{inner}</Link> : inner;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs text-primary mt-0.5">
          {payload[0].value} component{payload[0].value !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
};

const BAR_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-4)",
  "var(--color-chart-3)",
  "var(--color-chart-5)",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

export default function Dashboard() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const summary = data || {
    total_components: 0,
    low_stock_count: 0,
    checked_out_tools: 0,
    upcoming_maintenance: 0,
    expiring_subscriptions: 0,
    total_machines: 0,
    online_machines: 0,
    total_software: 0,
    recent_transactions: [],
    components_by_category: [],
  };

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Components"
          value={summary.total_components}
          icon={CpuChipIcon}
          iconColor="bg-emerald-500/10 text-emerald-400"
          href="/inventory"
        />
        <StatCard
          title="Low Stock"
          value={summary.low_stock_count}
          icon={ExclamationTriangleIcon}
          iconColor={summary.low_stock_count > 0 ? "bg-amber-500/10 text-amber-400" : "bg-muted text-muted-foreground"}
          href="/inventory"
          alert={summary.low_stock_count > 0}
        />
        <StatCard
          title="Checked Out"
          value={summary.checked_out_tools}
          icon={WrenchScrewdriverIcon}
          iconColor="bg-blue-500/10 text-blue-400"
          href="/tools"
        />
        <StatCard
          title="Maintenance"
          value={summary.upcoming_maintenance}
          icon={CalendarDaysIcon}
          iconColor={summary.upcoming_maintenance > 0 ? "bg-orange-500/10 text-orange-400" : "bg-muted text-muted-foreground"}
          href="/machines"
          alert={summary.upcoming_maintenance > 0}
        />
        <StatCard
          title="Expiring Soon"
          value={summary.expiring_subscriptions}
          icon={CreditCardIcon}
          iconColor={summary.expiring_subscriptions > 0 ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"}
          href="/subscriptions"
          alert={summary.expiring_subscriptions > 0}
        />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Category Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Components by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.components_by_category.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.components_by_category} barCategoryGap="20%">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      dx={-4}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "var(--color-accent)", opacity: 0.3 }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {summary.components_by_category.map((_: unknown, i: number) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <CpuChipIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No data yet</p>
                <p className="text-xs text-muted-foreground/60">Add components to see the breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            {summary.recent_transactions.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {summary.recent_transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
                    >
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.quantity_change > 0 ? "bg-emerald-500/10" : "bg-red-500/10"
                        }`}
                      >
                        {tx.quantity_change > 0 ? (
                          <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{tx.component_name}</p>
                        <p className="text-xs text-muted-foreground">{tx.reason}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={tx.quantity_change > 0 ? "green" : "red"}>
                          {tx.quantity_change > 0 ? "+" : ""}{tx.quantity_change}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {format(new Date(tx.created_at), "MMM d")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground/60">Stock changes will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
