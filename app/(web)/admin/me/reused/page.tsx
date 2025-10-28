"use client";

import useSWR from "swr";
import { ReusedThumbGrid } from "@/components/asset/reused-thumb-grid";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminMeReusedPage() {
  const { data } = useSWR("/api/me/overview", fetcher);
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-foreground">已复用</h1>
      <ReusedThumbGrid initialItems={(data?.reused ?? []) as any} isAuthenticated={true} />
    </div>
  );
}
