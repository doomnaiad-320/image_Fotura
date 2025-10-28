"use client";

import { useEffect, useState } from "react";
import { 
  Loader2, 
  CoinsIcon, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type Transaction = {
  id: string;
  userId: string;
  user: User | null;
  delta: number;
  reason: string;
  status: string;
  provider: { name: string; slug: string } | null;
  model: { displayName: string; slug: string } | null;
  providerSlug: string | null;
  modelSlug: string | null;
  requestId: string | null;
  refWorkId: string | null;
  refUserId: string | null;
  metadata: string;
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function AdminCreditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchLogs(1);
  }, [statusFilter]);

  const fetchLogs = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      });
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      const response = await fetch(`/api/admin/credit-logs?${params}`);
      
      if (!response.ok) {
        throw new Error("获取日志失败");
      }
      
      const data = await response.json();
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取日志失败");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: {
        icon: CheckCircle,
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        text: "成功",
      },
      pending: {
        icon: Clock,
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        text: "处理中",
      },
      failed: {
        icon: AlertCircle,
        className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        text: "失败",
      },
      refunded: {
        icon: RefreshCw,
        className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
        text: "已退款",
      },
    };

    const config = styles[status as keyof typeof styles] || styles.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const getCreditChangeDisplay = (delta: number) => {
    const isPositive = delta > 0;
    return (
      <div className={`flex items-center gap-1.5 font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        <span>{isPositive ? "+" : ""}{delta.toLocaleString()}</span>
      </div>
    );
  };

  const getReasonBadge = (reason: string) => {
    if (reason.includes("充值") || reason.includes("赠送") || reason.includes("注册")) {
      return <span className="text-xs text-green-400">💰 {reason}</span>;
    }
    if (reason.includes("复用") || reason.includes("奖励")) {
      return <span className="text-xs text-blue-400">🎁 {reason}</span>;
    }
    if (reason.includes("退款")) {
      return <span className="text-xs text-yellow-400">↩️ {reason}</span>;
    }
    return <span className="text-xs text-muted-foreground">📝 {reason}</span>;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">积分日志</h1>
        <p className="text-sm text-muted-foreground">
          查看所有用户的积分变动记录，包括充值、消费、复用奖励等。
        </p>
      </header>

      {/* 筛选栏 */}
      <div className="bg-surface border border-default rounded-lg p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-muted-foreground">状态筛选：</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-surface-2 border border-default rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部</option>
            <option value="success">成功</option>
            <option value="pending">处理中</option>
            <option value="failed">失败</option>
            <option value="refunded">已退款</option>
          </select>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* 交易记录表格 */}
      <div className="bg-surface border border-default rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <CoinsIcon className="w-12 h-12 mb-3" />
            <p>暂无交易记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2/50 border-b border-default">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    积分变动
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    原因
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    关联信息
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-foreground text-xs font-medium">
                          {tx.user?.name?.[0] || tx.user?.email[0].toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {tx.user?.name || "未知用户"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {tx.user?.email || tx.userId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getCreditChangeDisplay(tx.delta)}
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <div className="space-y-1">
                        {getReasonBadge(tx.reason)}
                        {tx.model && (
                          <div className="text-xs text-muted-foreground">
                            模型: {tx.model.displayName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-muted-foreground space-y-1">
                        {tx.provider && (
                          <div>提供商: {tx.provider.name}</div>
                        )}
                        {tx.requestId && (
                          <div className="font-mono truncate max-w-[150px]" title={tx.requestId}>
                            ID: {tx.requestId.slice(0, 8)}...
                          </div>
                        )}
                        {tx.refWorkId && (
                          <div className="text-purple-400">🔗 关联作品</div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-surface border border-default rounded-lg p-4">
          <div className="text-sm text-muted-foreground">
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="flex items-center gap-1 px-4 py-2 bg-surface-2 hover:bg-surface disabled:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </button>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="flex items-center gap-1 px-4 py-2 bg-surface-2 hover:bg-surface disabled:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg text-sm font-medium transition-colors"
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">总交易数</div>
            <div className="text-2xl font-bold text-foreground">{pagination.total}</div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">充值/奖励</div>
            <div className="text-2xl font-bold text-green-400">
              +{transactions.filter(t => t.delta > 0).reduce((sum, t) => sum + t.delta, 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">消费</div>
            <div className="text-2xl font-bold text-red-400">
              {transactions.filter(t => t.delta < 0).reduce((sum, t) => sum + t.delta, 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-surface border border-default rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">成功交易</div>
            <div className="text-2xl font-bold text-foreground">
              {transactions.filter(t => t.status === "success").length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
