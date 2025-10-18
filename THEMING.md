# THEMING.md

本项目的主题系统采用「语义化设计令牌 + CSS 变量 + Tailwind 扩展」方案，确保 dark/light 切换稳定且可维护。

## 目标
- 组件不直接使用具体色值或灰阶类名
- 仅通过语义化令牌控制颜色，随主题自动切换
- 有自动化检查，防止回退到硬编码颜色

---

## 使用方法（TL;DR）
- 背景：`bg-app`、`bg-surface`、`bg-surface-2`
- 文字：`text-foreground`、`text-muted-foreground`、`text-link`
- 边框：`border-default`
- 主色：`bg-primary`、`text-primary`、`text-primary-foreground`
- 滚动条（如启用插件）：`scrollbar-thumb-muted-foreground/30`、`scrollbar-track-transparent`

禁止：`bg-gray-*`、`text-gray-*`、`border-gray-*`、`bg-white|black`、`text-white|black` 等硬编码颜色类。

---

## 实现细节
- `styles/globals.css` 定义了 CSS 变量（按 `html[data-theme]` 分主题），并设置 `color-scheme`。
- `tailwind.config.ts` 将令牌暴露为颜色：`app`、`surface`、`surface-2`、`foreground`、`muted-foreground`、`default`（边框）、`primary`、`primary-foreground`、`link`、`nav-bg`。
- 你可以直接使用 Tailwind 类：`bg-app`、`text-foreground`、`border-default` 等。
- 主题切换通过 `<html data-theme="light|dark">` 完成，见 `components/theme/background-provider.tsx`。

---

## 代码规范
- 不允许在组件内出现任何具体色值或灰阶 Tailwind 类。
- 若需要新增颜色语义，请先在 `globals.css` 中添加变量，再在 `tailwind.config.ts` 暴露映射。
- 链接颜色：优先使用 `text-link`（或元素继承 `a { color: var(--color-link) }`）。

---

## 自动化检查
- 运行 `npm run lint:theme` 扫描 `app/`、`components/` 下的硬编码颜色类，并在发现时失败。
- 建议在 CI 中加入该命令，确保 PR 不引入违规类名。

---

## 常见替换清单
- `bg-gray-950` → `bg-app`
- `bg-gray-900/800` → `bg-surface`
- `bg-gray-800/700` → `bg-surface-2`
- `text-white` → `text-foreground`
- `text-gray-400/500` → `text-muted-foreground`
- `border-white/10` | `border-gray-700` → `border-default`
- `text-orange-*`（强调）→ 视需求使用 `text-primary` 或保留功能性色（需评估）

---

## 主题设计
- Light 与 Dark 的变量分别在 `globals.css` 的两个选择器块内维护：
  - `html[data-theme='light'] { ... }`
  - `html[data-theme='dark'] { ... }`
- 新需求先确定“语义”，再落到变量，不要直接定具体色值到组件。

---

## 测试建议
- 手动：切换主题后检查关键页面（首页、探索、工作台、对话）背景/文字/边框对比度。
- 自动：E2E（Playwright）中以不同主题打开核心页面做快照比对（可后续补充）。

