import { useState, useEffect } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useDebounce } from "../../hooks/useDebounce";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export default function SearchBar({
  value: controlledValue,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className = "",
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(controlledValue ?? "");
  const debouncedValue = useDebounce(localValue, debounceMs);

  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== localValue) {
      setLocalValue(controlledValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledValue]);

  return (
    <div className={cn("relative", className)}>
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-input bg-card pl-10 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
