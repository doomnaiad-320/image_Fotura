"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email({ message: "请输入有效邮箱" }),
  password: z.string().min(8, { message: "密码至少 8 位" })
});

type FormValues = z.infer<typeof schema>;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setLoading(true);
      const callbackUrl = searchParams.get("redirect") ?? "/";
      const result = await signIn("credentials", {
        ...values,
        redirect: false,
        callbackUrl
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("登录成功");
      router.push(result?.url ?? callbackUrl);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("登录失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  });

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm text-muted-foreground">
          邮箱
        </label>
        <Input id="email" type="email" placeholder="name@example.com" {...form.register("email")} />
        {emailError && <p className="text-xs text-red-400">{emailError}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm text-muted-foreground">
          密码
        </label>
        <Input
          id="password"
          type="password"
          placeholder="至少 8 位"
          {...form.register("password")}
        />
        {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        登录
      </Button>
    </form>
  );
}
