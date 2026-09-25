"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Tabs whose selection lives in `?tab=` so sidebar sub-links can deep-link to a tab. */
export function UrlTabs({ tabs, children }: { tabs: { value: string; label: string }[]; children: (tab: string) => React.ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = params.get("tab") ?? tabs[0]!.value;
  return (
    <Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`)}>
      <div className="mb-4 overflow-x-auto">
        <TabsList variant="line">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children(tab)}
    </Tabs>
  );
}
