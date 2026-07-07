"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelativeTime } from "@/lib/date-utils";
import { NotificationCategory } from "@/lib/enums";
import { groupNotificationsByDay } from "@/services/notifications";
import { useNotificationStore } from "@/stores/notification-store";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  [NotificationCategory.Approval]: "Approvals",
  [NotificationCategory.Alert]: "Alerts",
  [NotificationCategory.Analysis]: "Analysis",
  [NotificationCategory.Schedule]: "Schedule",
  [NotificationCategory.Learning]: "Learning",
  [NotificationCategory.System]: "System",
};

function NotificationList({ items }: { items: ReturnType<typeof useNotificationStore.getState>["items"] }) {
  if (!items.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No notifications in this category.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href ?? "/notifications"}
          className="block rounded-lg border border-border/80 p-3 transition-colors hover:bg-muted/40"
          onClick={() => useNotificationStore.getState().markRead(item.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
            </div>
            {!item.read ? <Badge>NEW</Badge> : null}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{item.category}</span>
            <span>·</span>
            <span>{formatRelativeTime(item.created_at)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function NotificationPanel() {
  const { items, panelOpen, setPanelOpen, markAllRead } = useNotificationStore();
  const grouped = useMemo(() => groupNotificationsByDay(items), [items]);

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category));
    return ["all", ...Array.from(unique)];
  }, [items]);

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{items.filter((item) => !item.read).length} unread</p>
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        </div>
        <Tabs defaultValue="all" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            {categories.slice(0, 3).map((category) => (
              <TabsTrigger key={category} value={category}>
                {CATEGORY_LABELS[category] ?? category}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all">
            <ScrollArea className="h-[calc(100vh-12rem)] pr-3">
              <p className="mb-2 text-label">Today</p>
              <NotificationList items={grouped.today} />
              <p className="mb-2 mt-6 text-label">Earlier</p>
              <NotificationList items={grouped.earlier} />
            </ScrollArea>
          </TabsContent>
          {categories.slice(1, 3).map((category) => (
            <TabsContent key={category} value={category}>
              <ScrollArea className="h-[calc(100vh-12rem)] pr-3">
                <NotificationList items={items.filter((item) => item.category === category)} />
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
