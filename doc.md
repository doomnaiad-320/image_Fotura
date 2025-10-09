
你是一名资深全栈工程师 + 产品经理。请为项目「AIGC Studio」完成“阶段一（MVP）」端到端实现与文档交付，并一次性给出完整代码与运行说明。严格按以下结构输出，遵守选型与验收标准。禁止在文档中附加示例请求或样例代码片段，仅交付要求与最终实现。

一、项目目标（必须实现）
- UI：黑白极简，响应式（PC/H5），中文文案。
- 路由：
  1) 首页（/）：瀑布流（CSS Columns），类型过滤（全部/图片/视频），排序（热门/最新），加载更多/无限滚动。
  2) 探索页（/explore）：更多筛选（占位即可），与接口解耦。
  3) 登录（/auth/signin）、注册（/auth/signup）：可提交；未登录点击“收藏/复用”拦截到登录。
  4) 移动 AppShell（/mobile）：纯 CSR 页面（相同组件），用于 Capacitor 静态导出与打包；所有数据走远程 API（NEXT_PUBLIC_API_BASE_URL）。
- 数据：≥24 条种子（图/视频），含 title、type、coverUrl/videoUrl、aspectRatio、durationSec（视频）、modelTag、tags、createdAt、hotScore/likes/views。
- SEO/SSR：Web 关键页（/、/explore）SSR；/mobile 纯 CSR 以便静态导出。
- 工程：TypeScript、ESLint+Prettier、e2e（Playwright）覆盖首页/登录/筛选。
- AI 多模型（OpenAI 协议兼容）：
  - 文本对话：/api/ai/chat/completions（别名：/v1/chat/completions）。
  - 图像生成：/api/ai/images/generations（别名：/v1/images/generations）。
  - 图像编辑：/api/ai/images/edits（别名：/v1/images/edits，支持 multipart/form-data）。
  - 统一使用 openai SDK 或 OpenAI 兼容 REST（动态 baseURL）；支持多厂商/多模型、流/非流式、白名单校验、超时与重试。
  - Provider 与模型库不写死在 .env：提供“后端配置模块 + 持久化存储 + 管理页面/API”以填写与拉取 Provider（baseURL、apiKey、headers）与模型库清单；支持从 Provider 拉取并导入模型。
- Credits：前端可选择模型并发起调用；后台按模型计费规则进行预扣与结算；余额展示与交易记录查询。

二、架构选型（先说明“选型+理由”，随后按此实现）
- Web：Next.js 14（App Router）+ React 18 + TypeScript + Tailwind CSS + NextAuth.js + Prisma + SQLite（开发）/ 可切 Postgres（生产）
  理由：SSR/SEO 友好、Vercel 友好、开发效率高、Tailwind 快速落地、Masonry 用 CSS Columns 无依赖。
- AI SDK：openai 官方 npm 包（兼容 OpenAI/OpenRouter/Together/DeepSeek/Ollama 等，动态 baseURL）。
- Capacitor：混合渲染策略；Web 用 SSR，移动端用 /mobile 纯 CSR + 远程 API；提供 capacitor.config.ts 与打包脚本。

三、范围与非目标
- 范围：
  - 前台：浏览/筛选/排序、登录注册、收藏/复用（登录校验）、AI 调用入口（含模型选择与余额展示）。
  - 后台（新增）：Provider/模型库配置模块（管理页面 + API），可手动填写与远程拉取导入；密钥加密存储；基础审计。
  - API：/api/assets、/api/favorites/toggle、/api/ai/models、/api/ai/chat/completions、/api/ai/images/generations、/api/ai/images/edits、/api/credits/balance、/api/credits/grant、/api/auth/token；以及 OpenAI 兼容别名 /v1/chat/completions、/v1/images/generations、/v1/images/edits。
- 非目标：支付/积分充值通道、媒体上传转码、复杂社交、消息推送、深链与离线缓存。

四、里程碑（7 天参考）
- D1：项目初始化（Next14+TS+Tailwind+Lint/Format）、主题与导航。
- D2：Masonry 组件与响应式、砖块卡、占位媒体。
- D3：Prisma 模型与 /api/assets（分页/筛选/排序/cursor），热度计算；首页接入。
- D4：NextAuth（Credentials）登录/注册、未登录拦截；用户角色与权限（admin）。
- D5：探索页筛选 UI 与服务端参数联动；URL 同步；/api/ai/models。
- D6：AI 文本接口（/api/ai/chat/completions）与 Provider 客户端工厂；Credits 预扣与结算；/api/credits/*。
- D7：图像生成功能（/api/ai/images/generations、/api/ai/images/edits，含 multipart 处理与定价）；OpenAI 兼容别名 /v1/*；Provider/模型库配置模块（/admin/ai）；/mobile CSR；Capacitor 指引；e2e。

五、数据模型（Prisma，含新增）
- User(id, email[unique], name, passwordHash, role['user'|'admin'], credits[int], createdAt)
- Asset(id, title, type['image'|'video'], coverUrl, videoUrl?, aspectRatio, durationSec?, modelTag, tags[string[]], views, likes, hotScore, createdAt)
- Favorite(id, userId, assetId, createdAt)
- Provider(id, slug[unique], name, baseURL, apiKeyEncrypted, extraHeaders[Json], enabled[bool], createdAt, updatedAt)
- AiModel(id, slug[unique], displayName, providerId, family, modalities[string[]], contextWindow[int], supportsStream[bool], pricing[Json], rateLimit[Json], tags[string[]], enabled[bool], sort[int], createdAt, updatedAt)
- CreditTransaction(id, userId, delta[int], reason, providerSlug, modelSlug, requestId, status['pending'|'success'|'failed'], meta[Json], createdAt)
- AiUsage(id, userId, providerSlug, modelSlug, tokensIn[int], tokensOut[int], latencyMs[int], costCredits[int], finishReason, requestId, createdAt)
说明：
- pricing 支持文本与图像两类：chat、image.generate、image.edit。每类可独立配置 fixedCreditsPerCall 或 perKTokens（文本）/perImage（图像），支持按 size、n 等因子线性或表驱动计费；定义最小计费单元与四舍五入规则。
- apiKey 加密存储（AES-256-GCM）；日志与返回值禁止回显明文。

六、AI 配置模块（核心，不使用 .env 存模型）
- 管理页面（/admin/ai，仅 admin 可访问）：
  - Provider 管理：新增/编辑/启用/禁用；字段含 baseURL、apiKey、extraHeaders；“连接测试”。
  - 模型库管理：新增/编辑/导入/批量启用禁用；字段含 provider 关联、displayName、slug、family、modalities（text/image）、supportsStream、pricing（含 chat/image.generate/image.edit）、rateLimit、tags、排序；搜索/筛选。
  - 从 Provider 拉取模型：尝试 OpenAI-like 目录端点；失败则手动录入；导入时支持批量映射 pricing/tags。
  - 变更审计：记录修改人、时间、内容。
- 服务与 API：
  - GET /api/ai/models：返回启用模型（含能力、定价与版本号）。
  - Admin APIs：/api/admin/ai/providers/*、/api/admin/ai/models/*（CRUD、导入、启用/禁用、连接测试）。
  - Server-only：providerClientFactory(providerSlug) 创建 openai SDK 客户端（注入 baseURL/apiKey/headers），内置超时与重试。

七、AI 能力与业务流程
- 文本对话（Chat Completions）：
  - 路径：POST /api/ai/chat/completions；OpenAI 兼容别名：POST /v1/chat/completions。
  - 行为：模型白名单校验 → Credits 预扣 → 调用 Provider（流/非流式）→ 记录用量 → 结算/回滚 → 返回规范化结果。
- 图像生成（Images Generations）：
  - 路径：POST /api/ai/images/generations；OpenAI 兼容别名：POST /v1/images/generations。
  - 行为：校验模型具备 image.generate 能力；根据 size、n、质量等参数计算预扣与结算；支持返回 b64_json 或 url；可选 persist 标记控制是否将结果保存为 Asset。
- 图像编辑（Images Edits）：
  - 路径：POST /api/ai/images/edits；OpenAI 兼容别名：POST /v1/images/edits。
  - 行为：支持 multipart/form-data（image、mask 等文件字段）；文件类型/大小校验；具备 image.edit 能力的模型方可调用；按 n、size 等计费；返回 b64_json 或 url；可选 persist。
- 统一要求：
  - requestId 幂等；Credits 预扣/结算统一在事务中；失败自动回滚。
  - 文件处理需使用 Node 运行时（非 Edge），并做 MIME/尺寸限制与临时文件清理。

八、API 契约（Next.js Route Handlers）
- GET /api/assets?type=all|image|video&sort=hot|new&cursor=xxx&limit=20
  响应：{ items: Asset[], nextCursor: string|null }
- POST /api/favorites/toggle  body: { assetId }  登录态；返回 { ok, favored }
- GET /api/ai/models
  响应：{ items: AiModel[], version: string }
- POST /api/ai/chat/completions
  body: { model, provider?, messages[], stream?, temperature?, maxTokens?, topP?, requestId }
- POST /api/ai/images/generations
  body: { model, provider?, prompt, size?, n?, responseFormat?, quality?, style?, user?, requestId, persist? }
- POST /api/ai/images/edits
  content-type: multipart/form-data
  fields: { model, provider?, prompt?, size?, n?, responseFormat?, user?, requestId, persist? }
  files: { image(required), mask(optional) }
- 兼容别名（OpenAI Wire-Compatible，功能等价，走相同鉴权与扣费）：
  - POST /v1/chat/completions
  - POST /v1/images/generations
  - POST /v1/images/edits
- GET /api/credits/balance
  响应：{ credits: number, recent: CreditTransaction[] }
- POST /api/credits/grant（仅 admin）
  body: { userId, delta, reason }
- Admin（仅 admin）：
  - Providers：GET/POST/PATCH/DELETE /api/admin/ai/providers
  - Models：GET/POST/PATCH/DELETE /api/admin/ai/models
  - 导入：POST /api/admin/ai/models/import  body: { providerId, strategy:'openaiLike'|'openrouter'|'together'|'ollama' }
  - 连接测试：POST /api/admin/ai/providers/test  body: { providerId }
- 鉴权：
  - Web：NextAuth 会话（Cookie）
  - AppShell（Capacitor）：Bearer Token（POST /api/auth/token 获取），CORS 放行

九、AI 代理与风控
- openai SDK 客户端工厂：new OpenAI({ apiKey, baseURL, timeout })，按 Provider 注入 extraHeaders（如 Referer/X-Title）。
- 超时与重试：AI_TIMEOUT_MS（默认 60s），对 429/5xx 做指数退避重试（2 次）。
- 模型白名单：来源于数据库启用模型（含能力 modalites=text/image 与操作类型）；不在库内或被禁用直接拒绝。
- 请求限速：对 /api/ai/* 与 /v1/* 端点按用户与 IP 限流。
- 消息尺寸与 Token 粗校验；图像大小/类型限制（MIME/分辨率/文件大小阈值）；临时文件清理。
- 错误统一规范化（provider/name/code/message/requestId）；日志脱敏。

十、前端关键实现（Web + H5 + Capacitor）
- 页面：/, /explore, /auth/signin, /auth/signup, /mobile（仅 CSR）, /admin/ai（仅 admin）
- 组件：Topbar、Masonry、BrickCard、FilterBar、Empty/Skeleton、ModelPicker（展示能力/定价/标签，区分文本与图像模型）、BalanceBadge（余额）
- 行为：
  - 模型选择：支持文本与图像模型分组；持久化最近一次选择；余额不足阻止调用
  - 调用总结：展示本次消耗（模型、类型：chat/image.generate/image.edit、积分、耗时）
  - /mobile：仅 CSR，所有请求走 NEXT_PUBLIC_API_BASE_URL；Capacitor 适配返回键/状态栏
  - 管理页：Provider/模型库增改查、导入、启用禁用、连接测试

十一、目录结构（含 Capacitor 与配置模块）
- prisma/schema.prisma
- src/
  - app/
    - layout.tsx, page.tsx, explore/page.tsx
    - auth/signin/page.tsx, auth/signup/page.tsx
    - mobile/page.tsx
    - admin/ai/page.tsx
    - api/assets/route.ts
    - api/favorites/route.ts
    - api/ai/models/route.ts
    - api/ai/chat/completions/route.ts
    - api/ai/images/generations/route.ts
    - api/ai/images/edits/route.ts
    - api/credits/balance/route.ts
    - api/credits/grant/route.ts
    - api/auth/token/route.ts
    - api/admin/ai/providers/route.ts
    - api/admin/ai/models/route.ts
    - v1/chat/completions/route.ts         ← OpenAI 兼容别名（代理到 /api/ai/...）
    - v1/images/generations/route.ts       ← 同上
    - v1/images/edits/route.ts             ← 同上
  - components/...
  - lib/
    - prisma.ts, auth.ts, seeds.ts, ranking.ts, types.ts
    - ai/providers.ts（Provider 服务层：CRUD、加解密、连接测试）
    - ai/models.ts（模型库服务层：CRUD、导入、白名单校验）
    - ai/client.ts（openai SDK 客户端工厂；动态 baseURL/apiKey/headers；流/非流式封装）
    - ai/pricing.ts（定价与结算逻辑；chat 与 image.* 支持 size、n 因子）
    - ai/usage.ts（用量记录与指标）
    - ai/guards.ts（参数与权限校验；multipart 校验）
    - ai/images.ts（图像生成/编辑服务：上传解析、MIME/尺寸校验、临时文件清理、结果封装）
    - native.ts（Capacitor 环境检测/返回键/状态栏）
    - http.ts（fetch 客户端：BASE_URL、Bearer Token、错误处理）
    - crypto.ts（AES-256-GCM 加解密 apiKey）
    - rate-limit.ts（限流）
    - uploads.ts（multipart 解析与文件限制）
  - styles/globals.css
- capacitor.config.ts
- public/assets/*
- tests/e2e/*

十二、构建与运行
- 双构建：
  - BUILD_TARGET=web：正常 SSR（生产部署）
  - BUILD_TARGET=cap：next export，仅导出 /mobile；其余页面标记 dynamic='error' 避免导出
- NPM 脚本（示例命名即可）：build:web、build:cap、cap:init、cap:copy、cap:android、cap:ios

十三、环境变量（仅基础，不存放模型清单）
- PROVIDER_DEFAULT=（可空，由模型库选择覆盖）
- ENCRYPTION_KEY=（用于 Provider.apiKey 加密，AES-256-GCM）
- AI_TIMEOUT_MS=60000
- MOCK_AI=0
- NEXTAUTH_SECRET=..., NEXTAUTH_URL=...
- NEXT_PUBLIC_API_BASE_URL=https://api.example.com
- CORS_ALLOW_ORIGINS=file://*,capacitor://localhost,app://*,https://yourdomain.com
说明：Provider 与模型清单由数据库管理，通过 /admin/ai 页面或 Admin API 录入与维护。

十四、测试与验收
- 单元测试：模型白名单校验、幂等扣费、余额不足拦截、Provider 客户端工厂、apiKey 加解密、multipart 文件校验与大小限制。
- 集成测试：AI 文本完整链路与图像生成/编辑完整链路（预扣→调用→结算→记录），文本流式与图片生成至少各一条；Admin 维护 Provider/模型并导入。
- e2e：前端可选择模型并成功完成一次文本与一次图像调用；余额不足提示；扣费后余额减少；切换模型生效；/admin/ai 可维护 Provider/模型。
- DoD：
  - 首页/探索页 SSR 可用；移动端 /mobile 正常拉取远程 API。
  - 通过 /admin/ai 填写 baseURL+apiKey 后：/api/ai/chat/completions、/api/ai/images/generations、/api/ai/images/edits 均可用（或 MOCK_AI=1 占位）。
  - 提供 OpenAI 兼容别名 /v1/*，与 /api/ai/* 行为与扣费一致。
  - Credits 预扣与结算链路正确，交易与余额一致；审计日志可追踪关键操作。
  - e2e 用例通过；Lighthouse（移动端）≥85。

十五、交付清单（一次性输出）
1) 架构选型与理由（≤300 字）
2) 里程碑与任务清单
3) 目录树（用途简注）
4) 关键文件完整代码（prisma/schema、NextAuth、API handlers：chat/images、页面组件、UI、样式、seed、AI 适配与路由、Credits、/admin/ai 管理页、加密/限流、multipart 处理、/mobile AppShell、native.ts、http.ts）
5) package.json、tsconfig、eslint/prettier、next.config.js
6) README（启动/构建/部署/环境变量；Provider/模型库后台维护流程；AI 超时/重试；Credits 策略；OpenAI 兼容端点；Capacitor 打包步骤）
7) 测试用例（Playwright e2e 3~5 条；必要的单测/集成测试）
要求：禁止在文档中包含示例请求或样例代码片段，但需按上述完整交付全部代码与运行说明；如篇幅受限，按顺序分多条消息连续输出，直至给齐，且每条消息末尾用“[续]”。

十六、实现细节（补充）
- Provider 拉取策略：
  - openai-like：GET {baseURL}/v1/models
  - openrouter：GET https://openrouter.ai/api/v1/models（支持自定义 headers）
  - together：GET https://api.together.xyz/v1/models
  - ollama：GET {baseURL}/v1/models 或 /api/tags
  - 不可用时提示手动维护；导入时可批量映射 pricing/tags。
- OpenAI 兼容别名：
  - /v1/chat/completions、/v1/images/generations、/v1/images/edits 与 /api/ai/* 共用同一服务层与鉴权/扣费逻辑；需返回 OpenAI 协议兼容结构。
- 安全与合规：
  - apiKey 仅服务端使用，禁止回显；CORS 校验；Admin 操作二次确认；错误统一规范化。
  - 文件安全：限制类型与大小；对可疑内容拒绝；临时文件隔离与自动清理。
- 可观测性：记录 requestId、provider、model、类型（chat/image.generate/image.edit）、状态、时延、消耗；暴露基础指标接口（无需仪表盘）。
- 性能：模型列表缓存（版本变化失效）；首页首屏优化、骨架屏/空态；Lighthouse 移动端 ≥85。
