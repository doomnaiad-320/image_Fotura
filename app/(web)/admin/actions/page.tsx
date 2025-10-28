"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminActionLogsPage() {
  const { data, isLoading, mutate } = useSWR("/api/admin/logs", fetcher, {
    refreshInterval: 60_000
  });

  const logs = (data?.logs ?? []) as Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    ip?: string | null;
    userAgent?: string | null;
    user: { email: string; name: string | null } | null;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">操作日志</h1>
        <Button variant="secondary" size="sm" onClick={() => mutate()}>刷新</Button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-default bg-surface">
        {isLoading ? (
          <div className="grid place-items-center py-16 text-sm text-muted-foreground">加载中...</div>
        ) : (
          <table className="min-w-full text-left text-sm text-muted-foreground">
            <thead className="bg-surface-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">操作</th>
                <th className="px-4 py-3">描述</th>
                <th className="px-4 py-3">操作者</th>
                <th className="px-4 py-3 text-right">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-default hover:bg-surface-2">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.description}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.user?.email ?? "系统"}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{log.ip ?? "-"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    暂无日志记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
