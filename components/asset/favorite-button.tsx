"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FavoriteButtonProps = {
  assetId: string;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  className?: string;
};

export function FavoriteButton({ assetId, initialFavorited, isAuthenticated, className }: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState<boolean>(initialFavorited);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/assets/${assetId}`);
      return;
    }

    const nextState = !favorited;
    setFavorited(nextState);
    setLoading(true);
    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, active: nextState })
      });
      if (!res.ok) {
        throw new Error("收藏操作失败");
      }
      toast.success(nextState ? "已收藏" : "已取消收藏");
    } catch (err) {
      setFavorited(!nextState);
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={favorited ? "primary" : "secondary"}
      className={cn("flex-1", className)}
      loading={loading}
      onClick={handleClick}
    >
      {favorited ? "已收藏" : "收藏"}
    </Button>
  );
}