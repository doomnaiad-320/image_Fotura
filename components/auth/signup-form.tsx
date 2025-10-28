"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    email: z.string().email({ message: "请输入有效邮箱" }),
    name: z
      .string()
      .min(2, { message: "昵称至少 2 个字符" })
      .max(32, { message: "昵称不超过 32 字符" }),
    password: z.string().min(8, { message: "密码至少 8 位" }),
    confirmPassword: z.string().min(8, { message: "再次输入密码" })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"]
  });

type FormValues = z.infer<typeof schema>;

export function SignUpForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = form.handleSubmit(async ({ email, name, password }) => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, name, password })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data?.message as string) ?? "注册失败");
      }

      toast.success("注册成功，正在为你登录...");

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "注册失败");
    } finally {
      setLoading(false);
    }
  });

  const errors = form.formState.errors;

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm text-muted-foreground">
          邮箱
        </label>
        <Input id="email" type="email" placeholder="name@example.com" {...form.register("email")} />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm text-muted-foreground">
          昵称
        </label>
        <Input id="name" placeholder="创作者昵称" {...form.register("name")} />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm text-muted-foreground">
          密码
        </label>
        <Input
          id="password"
          type="password"
          placeholder="至少 8 位"
          autoComplete="new-password"
          {...form.register("password")}
        />
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
          确认密码
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="再次输入密码"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        注册并登录
      </Button>
    </form>
  );
}
