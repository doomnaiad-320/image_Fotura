"use client";

import React, { useState, useEffect } from 'react';
import { Trash2, Download, Upload, RefreshCw, Database, AlertCircle } from 'lucide-react';
import { getStorageStats, clearOldHistory, clearAllHistory, exportAllData, importAllData } from '@/lib/storage/indexeddb';

interface StorageStats {
  totalImages: number;
  totalHistories: number;
  estimatedSizeMB: number;
}

export function LocalStorageManager() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 加载统计信息
  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getStorageStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // 清理30天前的非收藏记录
  const handleClearOld = async () => {
    const days = 30;
    const confirmed = window.confirm(
      `确定要清理 ${days} 天前的非收藏记录吗？\n此操作不可恢复。`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await clearOldHistory(days);
      await loadStats();
      alert(`已成功清理 ${days} 天前的非收藏记录`);
    } catch (error) {
      console.error('Failed to clear old history:', error);
      alert('清理失败，请查看控制台');
    } finally {
      setLoading(false);
    }
  };

  // 清空全部本地数据
  const handleClearAll = async () => {
    setLoading(true);
    try {
      await clearAllHistory();
      await loadStats();
      setShowClearConfirm(false);
      alert('已成功清空所有本地数据');
    } catch (error) {
      console.error('Failed to clear all history:', error);
      alert('清空失败，请查看控制台');
    } finally {
      setLoading(false);
    }
  };

  // 导出数据为 ZIP
  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await exportAllData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aigc-studio-backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('导出成功！');
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('导出失败，请查看控制台');
    } finally {
      setLoading(false);
    }
  };

  // 导入 ZIP 数据
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      '导入数据将会覆盖当前的本地数据，确定要继续吗？'
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    setImporting(true);
    try {
      await importAllData(file);
      await loadStats();
      alert('导入成功！');
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('导入失败，请查看控制台');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题和说明 */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6" />
          本地存储管理
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          所有生成的图片都存储在您的浏览器本地，不会上传到服务器。您可以随时清理或导出数据。
        </p>
      </div>

      {/* 统计信息卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">图片数量</div>
          <div className="text-2xl font-bold mt-1">
            {stats ? stats.totalImages : '...'} 张
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">历史记录</div>
          <div className="text-2xl font-bold mt-1">
            {stats ? stats.totalHistories : '...'} 条
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">估计占用</div>
          <div className="text-2xl font-bold mt-1">
            {stats ? stats.estimatedSizeMB.toFixed(2) : '...'} MB
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-4">
        {/* 刷新统计 */}
        <button
          onClick={loadStats}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新统计
        </button>

        {/* 清理操作 */}
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">清理选项</h3>
          
          <button
            onClick={handleClearOld}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-accent disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            清理 30 天前的非收藏记录
          </button>

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-accent disabled:opacity-50"
            >
              <AlertCircle className="w-4 h-4" />
              清空全部本地数据
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-red-600 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                此操作不可恢复，确定要继续吗？
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  确认清空
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-accent"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 导出/导入 */}
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">备份与恢复</h3>
          
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-accent disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            导出为 ZIP
          </button>

          <label className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-accent cursor-pointer">
            <Upload className="w-4 h-4" />
            {importing ? '导入中...' : '从 ZIP 导入'}
            <input
              type="file"
              accept=".zip"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="text-xs text-muted-foreground border-t pt-4">
        <p>💡 提示：</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>本地数据存储在浏览器的 IndexedDB 中</li>
          <li>清理浏览器缓存或更换设备会丢失数据</li>
          <li>建议定期导出重要图片以防数据丢失</li>
          <li>收藏的图片不会被自动清理</li>
        </ul>
      </div>
    </div>
  );
}
