import { redirect } from "next/navigation";
import { Users, Brain, ImageIcon, CoinsIcon, TrendingUp } from "lucide-react";

import { ensureAdmin } from "@/lib/ai/guards";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin?redirect=/admin");
  }
  
  try {
    ensureAdmin(user.role);
  } catch {
    redirect("/");
  }

  // 获取统计数据
  const [
    userCount,
    assetCount,
    providerCount,
    modelCount,
    totalCreditsUsed
  ] = await Promise.all([
    prisma.user.count(),
    prisma.asset.count({ where: { isDeleted: false } }),
    prisma.provider.count({ where: { enabled: true } }),
    prisma.aiModel.count({ where: { enabled: true } }),
    prisma.creditTransaction.aggregate({
      _sum: { delta: true },
      where: { status: "success", delta: { lt: 0 } }
    })
  ]);

  const stats = [
    {
      name: "用户总数",
      value: userCount,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-900/20",
    },
    {
      name: "资产总数",
      value: assetCount,
      icon: ImageIcon,
      color: "text-purple-500",
      bgColor: "bg-purple-900/20",
    },
    {
      name: "AI 提供商",
      value: providerCount,
      icon: Brain,
      color: "text-green-500",
      bgColor: "bg-green-900/20",
    },
    {
      name: "AI 模型",
      value: modelCount,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-900/20",
    },
    {
      name: "积分消耗",
      value: Math.abs(totalCreditsUsed._sum.delta || 0).toLocaleString(),
      icon: CoinsIcon,
      color: "text-yellow-500",
      bgColor: "bg-yellow-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">管理概览</h1>
        <p className="text-sm text-muted-foreground">
          系统整体运营数据总览
        </p>
      </header>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-surface border border-default rounded-lg p-6 hover:border-muted-foreground transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 快速导航 */}
      <div className="bg-surface border border-default rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">快速导航</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/admin/ai"
            className="flex items-center gap-3 p-4 bg-surface-2 hover:bg-surface rounded-lg transition-colors"
          >
            <Brain className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-sm font-medium text-foreground">AI 管理</div>
              <div className="text-xs text-muted-foreground">管理提供商和模型</div>
            </div>
          </a>
          <a
            href="/admin/users"
            className="flex items-center gap-3 p-4 bg-surface-2 hover:bg-surface rounded-lg transition-colors"
          >
            <Users className="w-5 h-5 text-purple-500" />
            <div>
              <div className="text-sm font-medium text-foreground">用户管理</div>
              <div className="text-xs text-muted-foreground">查看和管理用户</div>
            </div>
          </a>
          <a
            href="/admin/settings"
            className="flex items-center gap-3 p-4 bg-surface-2 hover:bg-surface rounded-lg transition-colors"
          >
            <CoinsIcon className="w-5 h-5 text-yellow-500" />
            <div>
              <div className="text-sm font-medium text-foreground">系统设置</div>
              <div className="text-xs text-muted-foreground">配置系统参数</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
