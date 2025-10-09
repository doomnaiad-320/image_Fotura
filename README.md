# AIGC Studio - Phase 1 MVP

AIGC Studio 是一个多模型 AIGC 创作与素材浏览平台，基于 Next.js 14 (App Router) + Prisma + NextAuth + Tailwind 搭建，提供首页瀑布流、探索筛选、AI 文生图/文生文工作台、Credits 计费以及 Provider/模型后台维护能力。本仓库交付阶段一 MVP 的全部代码、测试与文档。

## 快速开始

```bash
# 安装依赖
yarn install

# 初始化数据库（SQLite）并生成客户端
npx prisma migrate deploy
npm run prisma:generate

# 导入种子数据（管理员/普通用户 + 24 条资产 + Provider/模型）
npm run seed

# 本地开发
npm run dev
```

默认管理/普通账号：

- 管理员：`admin@aigc.studio` / `Admin123!@#`
- 普通用户：`user@aigc.studio` / `User123!@#`

## 目录结构速览

```
app/                # App Router 页面与 API handlers
components/         # UI 组件、导航、AI 控制台等
lib/                # Prisma、Auth、AI、Credits、工具函数
prisma/schema.prisma
seeds/              # 初始 Provider / 模型 / Asset 数据
styles/globals.css
tests/              # Vitest 单测&集成测试 + Playwright e2e
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | SQLite / Postgres 连接串，默认 `file:./prisma/dev.db` |
| `ENCRYPTION_KEY` | AES-256-GCM 密钥（32 字节），用于加密 Provider API Key |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | NextAuth 会话配置 |
| `NEXT_PUBLIC_API_BASE_URL` | 前端远程 API 基础地址（移动端 / CSR 使用） |
| `AI_TIMEOUT_MS` | AI 请求超时时间（默认 60000ms） |
| `MOCK_AI` | `1` 时进入 Mock 模式，所有 AI 请求返回占位结果 |
| `PROVIDER_DEFAULT` | 可选，默认 Provider Slug |
| `CORS_ALLOW_ORIGINS` | API 允许的跨域来源列表 |

可参考 `.env.example`。

## 数据库与 Seeds

- Prisma Schema 参见 `prisma/schema.prisma`
- 运行 `npm run seed` 写入：管理员/普通用户、24 条初始资产、Provider/模型清单、样例 Credit 交易
- `lib/seeds.ts` 抽象种子流程，生产可复用

## 运行与构建

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发 (Next.js) |
| `npm run build:web` | 生产构建（SSR） |
| `npm run start` | 生产启动 |
| `npm run build:cap` | 为 Capacitor 导出 `/mobile` CSR 版本 |
| `npm run cap:init` | 初始化 Capacitor 项目（webDir=`dist-cap`） |
| `npm run cap:copy` / `cap:android` / `cap:ios` | 同步 & 打开原生工程 |

### 移动端 `/mobile`

- `app/mobile/page.tsx` 为纯 CSR 页面，所有数据走 `NEXT_PUBLIC_API_BASE_URL`
- `BUILD_TARGET=cap npm run build:cap` 会 `next export` 仅导出该页面
- `capacitor.config.ts` 已配置 `webDir: dist-cap`

## 后台管理（/admin/ai）

- Provider 管理：新增/编辑/删除 Provider，选择性导入远程模型（OpenAI / OpenRouter / Together / Ollama 等），支持批量启用/禁用
- 模型库：按 Provider 列表展示，实时控制启用状态
- 用户管理：查看用户积分余额、切换角色（user/admin）、直接增减积分并填写原因
- 操作日志：所有关键变更（Provider/模型/积分/角色）自动写入 `AuditLog` 并在后台展示
- 相关 API：`/api/providers/*`、`/api/providers/[slug]/remote-models`、`/api/providers/[slug]/import`、`/api/models/*`、`/api/admin/users/*`、`/api/admin/logs`
- API Key 使用 `lib/crypto` AES-256-GCM 加密后存储

远程模型同步策略：

| Provider | 拉取 API |
| --- | --- |
| OpenAI 兼容 | `{baseURL}/v1/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| Together | `https://api.together.xyz/v1/models` |
| Ollama | `{baseURL}/api/tags` |

## Credits 策略

- 用户 `credits` 字段记录余额，`CreditTransaction` 记录所有加扣明细
- AI 请求流程：
  1. `prechargeCredits` 根据模型定价预扣（余额不足直接拒绝）
  2. 调用模型（`lib/ai/client` + `openai` SDK）
  3. 成功：`finalizeCredits` 按实际用量结算，多退少补；失败：`refundCredits`
  4. `AiUsage` 记录耗时、token、成本等指标
- 定价模型 `lib/ai/pricing.ts` 支持文本 token / 图像 size / edit 模式
- 管理员可通过 `/api/credits/grant` 或 `/api/admin/users/[id]` 增减积分（支持正负数），所有操作写入 `CreditTransaction` 与 `AuditLog`

## AI 请求说明

- 文本对话：`POST /api/ai/chat/completions` （兼容 `/v1/chat/completions`），支持 `stream`；未登录或余额不足返回 401/402
- 图像生成：`POST /api/ai/images/generations`（+ `/v1/...` 别名）
- 图像编辑：`POST /api/ai/images/edits`，multipart/form-data，支持 `image` + `mask`
- 所有请求走 `lib/ai/*` 服务层并复用 Credits / Usage / Mock 逻辑
- Rate limit：文本接口默认 60s 内 30 次/用户
- 超时：`AI_TIMEOUT_MS` 配置统一注入 openai 客户端

## OpenAI 兼容端点

| Endpoint | 说明 |
| --- | --- |
| `POST /api/ai/chat/completions` | 主入口 |
| `POST /v1/chat/completions` | OpenAI 协议别名 |
| `POST /api/ai/images/generations` | 文生图 |
| `POST /v1/images/generations` | 别名 |
| `POST /api/ai/images/edits` | 图像编辑 |
| `POST /v1/images/edits` | 别名 |

返回结构与 OpenAI 保持一致，Mock 模式下提供占位值，便于前端调试。

## 测试

- 单测：`npm run test:unit` （Vitest，覆盖加解密、Credits 结算、守卫、模型同步、上传校验等）
- 集成：`npm run test:integration` （mock 模式下验证 AI 链路完整性）
- Playwright：`npm run test:e2e`（首页、登录、工作台、管理员后台场景）

## 部署建议

1. 设置 `DATABASE_URL` 指向生产数据库（Postgres）并运行 `prisma migrate deploy`
2. 配置 `ENCRYPTION_KEY`、`NEXTAUTH_SECRET` 等环境变量
3. `npm run build:web` + `npm run start`
4. 使用 `/admin/ai` 维护实际 Provider 与模型
5. 如需移动端：执行 `npm run build:cap` + Capacitor 平台打包
