"use client";

import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registrationBonus, setRegistrationBonus] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        throw new Error("获取设置失败");
      }
      const data = await response.json();
      setRegistrationBonus(String(data.settings.registration_bonus_credits));
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "获取设置失败",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const credits = parseInt(registrationBonus, 10);
    if (isNaN(credits) || credits < 0) {
      setMessage({ type: "error", text: "请输入有效的积分数值" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "registration_bonus_credits",
          value: credits,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "保存失败");
      }

      setMessage({ type: "success", text: "设置已保存" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "保存失败",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">系统设置</h1>
        <p className="text-sm text-muted-foreground">
          配置系统全局参数，包括新用户注册奖励等。
        </p>
      </header>

      <div className="bg-surface border border-default rounded-lg p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* 注册奖励设置 */}
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">用户注册</h2>
            
            <div className="space-y-2">
              <label htmlFor="registrationBonus" className="block text-sm font-medium text-muted-foreground">
                新用户注册赠送积分
              </label>
              <input
                id="registrationBonus"
                type="number"
                min="0"
                step="1"
                value={registrationBonus}
                onChange={(e) => setRegistrationBonus(e.target.value)}
                className="w-full max-w-md px-4 py-2 bg-surface-2 border border-default rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5000"
              />
              <p className="text-xs text-muted-foreground">
                新用户注册后将自动获得该数量的积分，首位用户（管理员）固定为 100,000 积分
              </p>
            </div>
          </div>

          {/* 消息提示 */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-900/20 text-green-400 border border-green-800"
                  : "bg-red-900/20 text-red-400 border border-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 保存按钮 */}
          <div className="flex items-center gap-3 pt-4 border-t border-default">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-foreground rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存设置
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
