"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Settings, Database, TrendingDown, User } from 'lucide-react';
import { ConsumptionHistory } from './consumption-history';
import { Button } from '@/components/ui/button';
import { TopUpPanel } from './topup';
import { FavoritesPanel } from './favorites-panel';
import { useSearchParams } from 'next/navigation';
import { AppearanceStoragePanel } from './appearance-storage';

type TabKey = 'prefs' | 'consumption' | 'recharge' | 'favorites';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export function UserSettings() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>('prefs');

  const tabs: Tab[] = [
    { key: 'prefs', label: '外观与本地存储', icon: null, description: '主题与本地数据管理' },
    { key: 'consumption', label: '日志', icon: null, description: '查看豆的消费和充值记录' },
    { key: 'recharge', label: '充值', icon: null, description: '购买豆，支持多种支付方式' },
    { key: 'favorites', label: '我的收藏', icon: null, description: '查看已收藏的作品' },
  ];

  useEffect(() => {
    const tab = searchParams.get('tab');
    const keys = tabs.map(t => t.key);
    if (tab && keys.includes(tab as TabKey)) {
      setActiveTab(tab as TabKey);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="border-b pb-4">
<h1 className="text-2xl font-semibold text-foreground">个人设置</h1>
        <p className="text-sm text-muted-foreground mt-1">管理你的个人数据、消费记录和存储空间</p>
      </div>

      {/* 左侧功能栏 + 右侧内容区 */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* 左侧功能栏（传统 admin 样式） */}
        <aside>
          <nav className="rounded-lg border border-default bg-[var(--color-surface)] p-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  activeTab === tab.key ? 'bg-muted text-foreground' : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="text-sm font-medium">{tab.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{tab.description}</div>
              </button>
            ))}
          </nav>
        </aside>

        {/* 右侧内容区（普通内容区样式） */}
        <section className="min-h-[520px] space-y-6">
          {activeTab === 'prefs' && (
            <AppearanceStoragePanel />
          )}

          {activeTab === 'consumption' && (
            <div>
              <ConsumptionHistory />
            </div>
          )}

          {activeTab === 'recharge' && (
            <div>
              <TopUpPanel />
            </div>
          )}

          {activeTab === 'favorites' && (
            <div>
              <FavoritesPanel />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
