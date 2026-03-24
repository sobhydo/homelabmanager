import * as React from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { Textarea } from "./textarea";
import { useAISuggest } from "@/api/ai";
import { cn } from "@/lib/utils";

interface AITextareaProps
  extends React.ComponentProps<"textarea"> {
  /** Entity type for context, e.g. "component", "tool", "machine" */
  entityType?: string;
  /** Other form field values passed as context to AI */
  formContext?: Record<string, unknown>;
  /** Field name sent to AI (defaults to the `name` prop) */
  fieldName?: string;
}

function AITextarea({
  entityType = "",
  formContext = {},
  fieldName,
  className,
  name,
  value,
  onChange,
  ...props
}: AITextareaProps) {
  const suggestMutation = useAISuggest();
  const currentName = fieldName || name || "text";

  const handleSuggest = async () => {
    try {
      const result = await suggestMutation.mutateAsync({
        field_name: currentName,
        current_value: String(value || ""),
        context: formContext,
        entity_type: entityType,
      });

      // Simulate a change event so parent form state updates
      if (onChange) {
        const syntheticEvent = {
          target: {
            name: name || "",
            value: result.suggestion,
            type: "textarea",
          },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    } catch {
      // error handled by api client interceptor
    }
  };

  return (
    <div className="relative">
      <Textarea
        name={name}
        value={value}
        onChange={onChange}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={handleSuggest}
        disabled={suggestMutation.isPending}
        title="AI Suggest"
        className={cn(
          "absolute top-2 right-2 p-1 rounded-md transition-colors",
          "text-muted-foreground hover:text-primary hover:bg-primary/10",
          "disabled:opacity-50 disabled:cursor-wait",
          suggestMutation.isPending && "animate-pulse"
        )}
      >
        <SparklesIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export { AITextarea };
export type { AITextareaProps };
