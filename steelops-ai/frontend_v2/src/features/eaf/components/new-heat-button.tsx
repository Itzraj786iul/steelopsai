"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

type ButtonVariant = React.ComponentProps<typeof Button>["variant"];
type ButtonSize = React.ComponentProps<typeof Button>["size"];

export function NewHeatButton({
  variant = "outline",
  size = "sm",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const clearHeat = useCurrentHeatStore((s) => s.clearHeat);
  const hasActiveHeat = useCurrentHeatStore((s) => s.hasActiveHeat);

  const startNew = () => {
    clearHeat();
    setOpen(false);
    router.push("/eaf/prediction");
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className="shrink-0 px-2 sm:px-3"
        onClick={() => (hasActiveHeat() ? setOpen(true) : startNew())}
      >
        <Flame className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">New Heat</span>
        <span className="sr-only">New Heat</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start new heat?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will clear the current recipe, prediction, optimizer results, and validation for this session.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startNew}>Start New Heat</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LoadDifferentHeatLink() {
  const setMobileSheetOpen = useCurrentHeatStore((s) => s.setMobileSheetOpen);
  const setPanelCollapsed = useCurrentHeatStore((s) => s.setPanelCollapsed);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setPanelCollapsed(false);
        setMobileSheetOpen(true);
      }}
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      Load Different Heat
    </Button>
  );
}
