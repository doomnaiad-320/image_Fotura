"use client";

import React, { useState } from 'react';
import { Settings, Database, TrendingDown, User } from 'lucide-react';
import { LocalStorageManager } from '@/components/storage/local-storage-manager';
import { ConsumptionHistory } from './consumption-history';
import { Button } from '@/components/ui/button';
import { AppearanceSelector } from './appearance-selector';

type TabKey = 'appearance' | 'storage' | 'consumption';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export function UserSettings() {
  const [activeTab, setActiveTab] = useState<TabKey>('storage');

  const tabs: Tab[] = [
    { key: 'appearance', label: '外观', icon: null, description: '选择页面背景风格' },
    { key: 'storage', label: '本地存储', icon: null, description: '管理本地图片和历史记录' },
    { key: 'consumption', label: '消费历史', icon: null, description: '查看豆的消费和充值记录' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold">个人设置</h1>
        <p className="text-sm text-muted-foreground mt-1">管理你的个人数据、消费记录和存储空间</p>
      </div>

      {/* 左侧功能栏 + 右侧内容区 */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* 左侧功能栏（去线框，简洁） */}
        <aside>
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`text-left px-3 py-2 rounded-md transition-colors hover:bg-muted ${activeTab === tab.key ? 'bg-muted' : ''}`}
              >
                <div className="text-sm font-medium">{tab.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{tab.description}</div>
              </button>
            ))}
          </nav>
        </aside>

        {/* 右侧内容区 */}
        <section className="min-h-[520px]">
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">页面背景风格</h2>
              <p className="text-sm text-muted-foreground">选择你喜欢的全站背景颜色风格。尽量保持简洁，不影响内容可读性。</p>
              <AppearanceSelector />
            </div>
          )}

          {activeTab === 'storage' && (
            <div>
              <LocalStorageManager />
            </div>
          )}

          {activeTab === 'consumption' && (
            <div>
              <ConsumptionHistory />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
