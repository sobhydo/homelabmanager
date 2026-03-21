interface StockIndicatorProps {
  quantity: number;
  minimumStock: number;
  showLabel?: boolean;
  className?: string;
}

export default function StockIndicator({
  quantity,
  minimumStock,
  showLabel = true,
  className = "",
}: StockIndicatorProps) {
  let color: string;
  let fillColor: string;
  let label: string;

  if (quantity === 0) {
    color = "text-red-500";
    fillColor = "bg-red-500";
    label = "Out of stock";
  } else if (quantity <= minimumStock) {
    color = "text-amber-500";
    fillColor = "bg-amber-500";
    label = "Low stock";
  } else {
    color = "text-emerald-500";
    fillColor = "bg-emerald-500";
    label = "In stock";
  }

  const percentage = minimumStock > 0 ? Math.min((quantity / (minimumStock * 3)) * 100, 100) : 100;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`font-semibold ${color}`}>{quantity}</span>
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${fillColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      {showLabel && (
        <span className={`text-xs ${color}`}>{label}</span>
      )}
    </div>
  );
}
