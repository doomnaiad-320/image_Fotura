"use client";

import useSWR from "swr";
import { PublishedGrid } from "@/components/asset/published-grid";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminMePublishedPage() {
  const { data } = useSWR("/api/me/overview", fetcher);
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-foreground">已发布</h1>
      <PublishedGrid initialItems={(data?.published ?? []) as any} isAuthenticated={true} />
    </div>
  );
}
