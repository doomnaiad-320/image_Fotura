# AIGC Studio · V1 任务清单（含状态标记）
标记说明： [x] 已完成  [ ] 未完成（P0=上线阻断，P1=可延后）

## 1) 路由与导航
- [ ] P0 首页入口：新增 `app/page.tsx`（重定向到 `/explore` 或首屏引导到 `/studio`）
- [x] P0 主导航：`components/navigation/main-navigation.tsx`

## 2) 认证与用户
- [x] 登录/注册/会话（NextAuth + JWT）
- [x] 种子账户与默认赠豆：`prisma/seed.ts`
- [x] 余额接口：`/api/credits/balance`

## 3) AI 工作台（图片）
- [x] 文生图/图生图、链式“作为输入”：`components/ai/conversation/*`、`/api/ai/images/*`
- [x] 历史持久化（IndexedDB）：`lib/storage/conversation-db.ts`
- [ ] P0 图片接口限流：为 `/api/ai/images/generations`、`/edits` 增加 `createRateLimiter`
- [ ] P1 Mask 涂抹/滑块 UI（可延后）

## 4) 模型 / Provider
- [x] Provider 管理/远程模型同步/导入：`/api/providers/*`、`/admin/ai`
- [x] 模型定价、启用/排序：`lib/ai/models.ts`
- [ ] P1 Prompt 优化器模型设置（管理 UI 支持 isPromptOptimizer）

## 5) 计费 / 支付
- [x] 预扣→结算→退款：`lib/credits.ts`
- [x] 易支付下单/回调入账：`/api/payments/easypay/*`、`lib/payments/easypay.ts`
- [ ] P1 充值完成回显与返回页提示优化（`/settings?tab=recharge`）

## 6) 资产与浏览
- [x] 发布到首页：`/api/assets/publish`（自动上传 R2：`/api/upload`）
- [x] 探索页与详情页：`app/(web)/explore/page.tsx`、`app/(web)/assets/[id]/page.tsx`
- [ ] P0 探索卡片组件缺失：`components/asset/asset-masonry.tsx` 引用 `./asset-card`，需补 `components/asset/asset-card.tsx`

## 7) 收藏与复用
- [x] 收藏接口：`/api/favorites/toggle`
- [ ] P1 收藏 UI 串联（探索/详情页按钮状态同步）
- [x] 复用扣费与作者奖励（防重复）：`/api/assets/[id]/reuse`
- [x] 复用积分配置接口：`/api/settings/reuse-points`

## 8) API 与安全
- [x] 聊天限流：`/api/ai/chat/completions` + `lib/rate-limit.ts`
- [ ] P0 图像接口限流：同 3) 中任务
- [x] Provider Key 加密：`lib/crypto.ts`
- [ ] P1 基础内容安全与拦截（占位规则）
- [ ] P1 前后端错误上报/核心埋点（最小事件）

## 9) 管理后台
- [x] AI 管理台：`app/(web)/admin/ai/page.tsx`
- [x] 用户列表/加减豆/审计日志：`/api/admin/*`
- [ ] P1 模型优化器标记的后台操作入口

## 10) 观测与测试
- [x] 单元/集成/E2E 基础：`tests/*`
- [ ] P1 指标与看板（基于 `AiUsage/CreditTransaction`）
- [ ] P1 Sentry/埋点接入

## 11) 前后端不一致 / 必修复（专项 P0）
- [ ] `/api/credits/history` 与 `components/settings/consumption-history.tsx` 字段不匹配  
  方案A：在接口层映射 `delta→amount`、`status→status`、`createdAt→ISO`、`metadata→object`、合成 `type/balance*` 字段；  
  方案B：前端改读 `delta/status/createdAt/metadata` 并移除不存在字段。
- [ ] `lib/ai/prompt-merger.ts` 引用不存在方法（`getOpenAIClient`/`decryptApiKey`）  
  方案A：直接回退为 `mergePromptSimple`；  
  方案B：改用 `createOpenAIClient` + `decryptSecret` 并仅在已配置优化器模型时启用。
- [ ] 探索卡片组件缺失：新增 `components/asset/asset-card.tsx` 以适配 `AssetMasonry` 召唤签名（图片、标题、跳转、收藏按钮）。

## 12) 上线前检查（P0）
- [ ] 环境变量核对：`ENCRYPTION_KEY`、`NEXTAUTH_SECRET`、R2 与易支付配置、`MOCK_AI` 切换
- [ ] 闭环回归：登录→生成→发布→探索可见→收藏→复用扣费/奖励→充值到账
- [ ] 404/500 兜底页（简版即可）

---
建议任务执行顺序（P0）：首页入口 → 探索卡片 → credits/history 对齐 → prompt-merger 回退/修复 → 图像接口限流 → 回归测试与环境校验。