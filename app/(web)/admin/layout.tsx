import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Brain, 
  Users, 
  Settings, 
  Database,
  FileText,
  ImageIcon
} from "lucide-react";

import { ensureAdmin } from "@/lib/ai/guards";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const navItems = [
  {
    name: "概览",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "AI 管理",
    href: "/admin/ai",
    icon: Brain,
  },
  {
    name: "用户管理",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "资产管理",
    href: "/admin/assets",
    icon: ImageIcon,
  },
  {
    name: "系统设置",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    name: "操作日志",
    href: "/admin/logs",
    icon: FileText,
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin?redirect=/admin");
  }
  
  try {
    ensureAdmin(user.role);
  } catch {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* 左侧导航栏 */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo 区域 */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-500" />
            <span className="text-lg font-semibold text-white">管理后台</span>
          </Link>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 用户信息 */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {user.name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user.name || user.email}
              </div>
              <div className="text-xs text-gray-400">{user.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
