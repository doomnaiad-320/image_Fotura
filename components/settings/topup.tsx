"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

const PACKAGES = [
  { credits: 600, price: 6 },
  { credits: 3000, price: 30 },
  { credits: 6800, price: 68 },
  { credits: 12800, price: 128 },
];

export function TopUpPanel() {
  const [selected, setSelected] = useState(PACKAGES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPay = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/easypay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: selected.credits, name: `充值 ${selected.credits} 豆` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "下单失败");
      window.location.href = data.redirectUrl;
    } catch (e: any) {
      setError(e.message || "下单失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">充值豆</h2>
        <p className="text-sm text-muted-foreground mt-1">选择套餐，跳转至收银台完成支付。</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PACKAGES.map((p) => (
          <button
            key={p.credits}
            onClick={() => setSelected(p)}
            className={`border rounded-lg p-4 text-left hover:border-foreground/40 transition-colors ${
              selected.credits === p.credits ? "border-foreground" : "border-border"
            }`}
          >
            <div className="text-2xl font-bold">{p.credits}</div>
            <div className="text-xs text-muted-foreground mt-1">豆</div>
            <div className="mt-3 text-sm">¥ {p.price.toFixed(2)}</div>
          </button>
        ))}
      </div>

      {error && (
        <div className="border border-red-500/50 bg-red-500/10 rounded-md p-3 text-sm text-red-600">{error}</div>
      )}

      <Button onClick={startPay} disabled={loading}>
        {loading ? "跳转中..." : `去支付（¥${selected.price.toFixed(2)}）`}
      </Button>

      <div className="text-xs text-muted-foreground">
        支付完成后请等待 1-2 秒自动到账；如未到账请刷新页面。
      </div>
    </div>
  );
}
