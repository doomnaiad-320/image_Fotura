"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, TrendingDown, Coins, Calendar } from 'lucide-react';
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
  statistics: {
    totalRecords: number;
    totalSpent: number;
    totalEarned: number;
    netChange: number;
  };
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
  const [statistics, setStatistics] = useState({
    totalRecords: 0,
    totalSpent: 0,
    totalEarned: 0,
    netChange: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 时间筛选状态
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  const loadHistory = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/credits/history?page=${page}&limit=20`;
      if (dateRange.start) url += `&startDate=${dateRange.start}`;
      if (dateRange.end) url += `&endDate=${dateRange.end}`;
      
      const data = await httpFetch<ConsumptionResponse>(url);
      setTransactions(data.transactions);
      setPagination(data.pagination);
      setStatistics(data.statistics);
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

  const handleDateFilter = () => {
    loadHistory(1); // 重新从第一页加载
  };

  const handleClearFilter = () => {
    setDateRange({ start: '', end: '' });
    setTimeout(() => loadHistory(1), 0);
  };

  // 快捷时间筛选
  const setQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
    setTimeout(() => loadHistory(1), 0);
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

      {/* 时间筛选 */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="w-4 h-4" />
          时间筛选
        </div>
        
        {/* 快捷筛选 */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setQuickDateRange(7)}
          >
            最近7天
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setQuickDateRange(30)}
          >
            最近30天
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setQuickDateRange(90)}
          >
            最近90天
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearFilter}
          >
            全部时间
          </Button>
        </div>

        {/* 自定义日期范围 */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground mb-1 block">开始日期</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground mb-1 block">结束日期</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleDateFilter}
            disabled={!dateRange.start && !dateRange.end}
          >
            应用筛选
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            总记录数
          </div>
          <div className="text-2xl font-bold mt-1">{statistics.totalRecords}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            已消费
          </div>
          <div className="text-2xl font-bold mt-1 text-red-500">
            {statistics.totalSpent}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-green-500" />
            已充值
          </div>
          <div className="text-2xl font-bold mt-1 text-green-500">
            {statistics.totalEarned}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            净变化
          </div>
          <div className={`text-2xl font-bold mt-1 ${
            statistics.netChange > 0 ? 'text-green-500' :
            statistics.netChange < 0 ? 'text-red-500' : ''
          }`}>
            {statistics.netChange > 0 ? '+' : ''}{statistics.netChange}
          </div>
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
