"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, UserPlus, CoinsIcon } from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  credits: number;
  createdAt: string;
  updatedAt: string;
};

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCredits, setNewCredits] = useState("0");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (query?: string) => {
    try {
      setLoading(true);
      setError(null);
      const url = query
        ? `/api/admin/users?q=${encodeURIComponent(query)}`
        : "/api/admin/users";
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("获取用户列表失败");
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-900/20 text-purple-400 border-purple-800";
      case "user":
        return "bg-blue-900/20 text-blue-400 border-blue-800";
      default:
        return "bg-surface-2 text-muted-foreground border-default";
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">用户管理</h1>
        <p className="text-sm text-muted-foreground">
          查看和管理所有用户账号,调整积分余额。
        </p>
      </header>

      {/* 搜索栏 + 操作 */}
      <div className="bg-surface border border-default rounded-lg p-4">
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex gap-3 flex-1">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索邮箱或用户名..."
                className="w-full pl-10 pr-4 py-2 bg-surface-2 border border-default rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              搜索
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchUsers();
                }}
                className="px-4 py-2 bg-surface-2 hover:bg-surface text-foreground rounded-lg font-medium transition-colors"
              >
                清除
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            添加用户
          </button>
        </div>
      </div>

      {/* 新建用户弹窗 */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-default bg-surface p-6">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">添加用户</h3>
              <p className="text-xs text-muted-foreground">创建新用户并设置初始积分</p>
            </header>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setCreating(true);
                  setError(null);
                  const credits = parseInt(newCredits, 10);
                  const res = await fetch("/api/admin/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: newEmail.trim(),
                      name: newName.trim(),
                      password: newPassword,
                      credits: Number.isFinite(credits) ? credits : 0,
                      role: newRole,
                    })
                  });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data?.message || "创建失败");
                  }
                  setCreateOpen(false);
                  setNewEmail("");
                  setNewName("");
                  setNewPassword("");
                  setNewCredits("0");
                  setNewRole("user");
                  await fetchUsers();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "创建失败");
                } finally {
                  setCreating(false);
                }
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">邮箱</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2 bg-surface-2 border border-default rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">昵称</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="创作者昵称"
                    className="w-full px-4 py-2 bg-surface-2 border border-default rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">初始积分</label>
                  <input
                    type="number"
                    min="0"
                    value={newCredits}
                    onChange={(e) => setNewCredits(e.target.value)}
                    className="w-full px-4 py-2 bg-surface-2 border border-default rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">角色</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
                    className="w-full px-4 py-2 bg-surface-2 border border-default rounded-lg text-foreground focus:outline-none"
                  >
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm text-muted-foreground">密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 8 位"
                    className="w-full px-4 py-2 bg-surface-2 border border-default rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-400 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 bg-surface-2 hover:bg-surface rounded-lg text-foreground"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
                >
                  {creating ? "创建中..." : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* 用户表格 */}
      <div className="bg-surface border border-default rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <UserPlus className="w-12 h-12 mb-3" />
            <p>暂无用户数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-default">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    积分余额
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    最后更新
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-surface-2 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                          {user.name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {user.name || "未设置"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role === "admin" ? "管理员" : "普通用户"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <CoinsIcon className="w-4 h-4 text-yellow-500" />
                        {user.credits.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(user.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 统计信息 */}
      {!loading && users.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>共 {users.length} 个用户</div>
          <div className="flex gap-6">
            <div>
              管理员:{" "}
              <span className="text-foreground font-medium">
                {users.filter((u) => u.role === "admin").length}
              </span>
            </div>
            <div>
              普通用户:{" "}
              <span className="text-foreground font-medium">
                {users.filter((u) => u.role === "user").length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
