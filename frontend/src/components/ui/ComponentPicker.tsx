import { useState, useEffect, useRef } from "react";
import { useSearchComponents } from "../../api/components";
import type { Component } from "../../types/component";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ChevronUpDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ComponentPickerProps {
  value?: Component | null;
  onChange: (component: Component | null) => void;
  className?: string;
  placeholder?: string;
  inputClassName?: string;
}

export default function ComponentPicker({
  value,
  onChange,
  className,
  placeholder = "Search components...",
  inputClassName,
}: ComponentPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: results, isLoading } = useSearchComponents(search);
  const inputRef = useRef<HTMLInputElement>(null);

  // When opening, focus the search input
  useEffect(() => {
    if (open) {
      setSearch("");
    }
  }, [open]);

  const displayLabel = value ? value.name : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            !value && "text-muted-foreground",
            inputClassName
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <div className="flex items-center gap-0.5 shrink-0 ml-1">
            {value && (
              <span
                role="button"
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-50" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder="Type to search..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {search.length < 2 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : isLoading ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Searching...
              </div>
            ) : (
              <>
                <CommandEmpty>No components found.</CommandEmpty>
                <CommandGroup>
                  {(results || []).map((comp) => (
                    <CommandItem
                      key={comp.id}
                      value={String(comp.id)}
                      onSelect={() => {
                        onChange(comp);
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium truncate">
                          {comp.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {[comp.package_type, comp.mpn || comp.manufacturer_part_number]
                            .filter(Boolean)
                            .join(" · ") || "No details"}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
