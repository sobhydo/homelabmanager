import { type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  size = "md",
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn(sizeClasses[size])}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {/* Hidden description for a11y – prevents Radix warning */}
            <DialogDescription className="sr-only">
              {title}
            </DialogDescription>
          </DialogHeader>
        )}
        <div>{children}</div>
        {actions && (
          <DialogFooter className="flex items-center justify-end gap-3">
            {actions}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
