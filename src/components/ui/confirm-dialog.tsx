"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Info, HelpCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
type ConfirmVariant = "danger" | "warning" | "info" | "default";

interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Custom icon — overrides variant default */
  icon?: React.ReactNode;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

/* ── Variant config ── */
const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    icon: React.ReactNode;
    iconBg: string;
    iconText: string;
    confirmBtnClass: string;
    confirmVariant: "default" | "destructive" | "outline";
  }
> = {
  danger: {
    icon: <Trash2 className="h-5 w-5" />,
    iconBg: "bg-destructive/10 dark:bg-destructive/15",
    iconText: "text-destructive",
    confirmBtnClass: "",
    confirmVariant: "destructive",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    iconText: "text-amber-600 dark:text-amber-400",
    confirmBtnClass:
      "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 hover:border-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700",
    confirmVariant: "default",
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    iconBg: "bg-sky-500/10 dark:bg-sky-500/15",
    iconText: "text-sky-600 dark:text-sky-400",
    confirmBtnClass:
      "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 hover:border-sky-700 dark:bg-sky-600 dark:hover:bg-sky-700",
    confirmVariant: "default",
  },
  default: {
    icon: <HelpCircle className="h-5 w-5" />,
    iconBg: "bg-primary/10 dark:bg-primary/15",
    iconText: "text-primary",
    confirmBtnClass: "",
    confirmVariant: "default",
  },
};

/* ── Global store (singleton pattern) ── */
type Listener = () => void;

let globalState: ConfirmDialogState = {
  open: false,
  title: "",
  resolve: null,
};

const listeners = new Set<Listener>();

function setState(next: Partial<ConfirmDialogState>) {
  globalState = { ...globalState, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return globalState;
}

/* ── Imperative API ── */

/**
 * Show a confirmation dialog and return a promise that resolves to `true` (confirm) or `false` (cancel).
 *
 * @example
 * ```tsx
 * const ok = await confirmDialog({
 *   title: "Delete this item?",
 *   description: "This action cannot be undone.",
 *   variant: "danger",
 * });
 * if (ok) { doDelete(); }
 * ```
 */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    setState({
      ...options,
      open: true,
      resolve,
    });
  });
}

/* ── React component (mount once in layout) ── */

export function ConfirmDialogProvider() {
  const state = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const handleResult = React.useCallback(
    (result: boolean) => {
      state.resolve?.(result);
      setState({ open: false, resolve: null });
    },
    [state],
  );

  const variant = state.variant || "default";
  const cfg = VARIANT_CONFIG[variant];

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) handleResult(false);
      }}
    >
      <DialogContent
        className="sm:max-w-[420px] p-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Icon header band */}
        <div className="flex flex-col items-center gap-3 pt-7 pb-2 px-6">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full ring-4 ring-background shadow-sm",
              cfg.iconBg,
              cfg.iconText,
            )}
          >
            {state.icon || cfg.icon}
          </div>
        </div>

        <div className="px-6 pb-2 text-center space-y-2">
          <DialogHeader className="items-center">
            <DialogTitle className="text-base font-semibold leading-snug">
              {state.title}
            </DialogTitle>
          </DialogHeader>
          {state.description && (
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-[340px] mx-auto">
              {state.description}
            </DialogDescription>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 justify-center px-6 pb-6 pt-4 border-0 bg-transparent">
          <Button
            variant="outline"
            className="flex-1 rounded-lg"
            onClick={() => handleResult(false)}
          >
            {state.cancelLabel || "Cancel"}
          </Button>
          <Button
            variant={cfg.confirmVariant}
            className={cn("flex-1 rounded-lg", cfg.confirmBtnClass)}
            onClick={() => handleResult(true)}
          >
            {state.confirmLabel || "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
