"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { httpFetch } from '@/lib/http';
import { Button } from '@/components/ui/button';

interface CreditTransaction {
  id: string;
  type: 'debit' | 'credit' | 'precharge' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  metadata: Record<string, any>;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ConsumptionResponse {
  transactions: CreditTransaction[];
  pagination: PaginationInfo;
}

const TYPE_LABELS: Record<string, string> = {
  debit: "消费",
  credit: "充值",
  precharge: "预扣",
  refund: "退款",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  completed: "已完成",
  cancelled: "已取消",
};

export function ConsumptionHistory() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await httpFetch<ConsumptionResponse>(
        `/api/credits/history?page=${page}&limit=20`
      );
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load consumption history:', err);
      setError('加载消费记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadHistory(newPage);
  };

  const getTypeColor = (_type: string) => {
    return 'text-foreground';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-foreground';
      case 'pending':
        return 'text-muted-foreground';
      case 'cancelled':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const sign = type === 'debit' || type === 'precharge' ? '-' : '+';
    return `${sign}${Math.abs(amount)}`;
  };

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="w-6 h-6" />
            消费历史
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            查看所有的豆消费和充值记录
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadHistory(pagination.page)}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">总记录数</div>
          <div className="text-2xl font-bold mt-1">{pagination.total}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">当前页</div>
          <div className="text-2xl font-bold mt-1">
            {pagination.page} / {pagination.totalPages || 1}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">每页显示</div>
          <div className="text-2xl font-bold mt-1">{pagination.limit} 条</div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="border border-red-500/50 bg-red-500/10 rounded-lg p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* 交易记录表格 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">时间</th>
                <th className="px-4 py-3 text-left font-medium">类型</th>
                <th className="px-4 py-3 text-left font-medium">金额</th>
                <th className="px-4 py-3 text-left font-medium">余额变化</th>
                <th className="px-4 py-3 text-left font-medium">原因</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    加载中...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    暂无消费记录
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${getTypeColor(transaction.type)}`}>
                        {TYPE_LABELS[transaction.type] || transaction.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">
                        {formatAmount(transaction.amount, transaction.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>{transaction.balanceBefore}</span>
                        <span>→</span>
                        <span className="font-medium">{transaction.balanceAfter}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {transaction.reason || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${getStatusColor(transaction.status)}`}>
                        {STATUS_LABELS[transaction.status] || transaction.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页控制 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            显示 {(pagination.page - 1) * pagination.limit + 1} 到{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </Button>
            <div className="text-sm px-3">
              {pagination.page} / {pagination.totalPages}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || loading}
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
