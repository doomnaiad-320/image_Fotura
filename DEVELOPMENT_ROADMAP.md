# AIGC Studio 作品复用功能开发计划

> 基于 AIRelease.md 规划的功能，本文档详细列出当前状态和待实现任务

## 📊 当前状态分析

### ✅ 已实现功能
1. **基础发布系统**
   - ✅ 用户可以发布 AI 生成作品
   - ✅ 保存 Prompt、模型、参数等完整信息
   - ✅ 首页瀑布流展示
   - ✅ 资产详情页
   - ✅ 云存储集成（R2）
   - ✅ 基础积分系统

2. **数据库模型**
   - ✅ User 模型（含 credits 字段）
   - ✅ Asset 模型（含 prompt、userId 等字段）
   - ✅ CreditTransaction 模型（积分交易）
   - ✅ Favorite 模型（收藏功能）

### ❌ 未实现功能（AIRelease.md 规划）

根据 AIRelease.md 的功能设计，以下是**完全缺失**的核心功能：

1. **作品复用系统** ❌
   - 复用按钮和扣费逻辑
   - Prompt 预填到创作面板
   - 复用积分设置（min/max/current）
   - 一次性奖励机制

2. **派生作品追踪** ❌
   - work_relations 表（来源关系）
   - reuse_records 表（防刷记录）
   - 派生作品发布流程

3. **积分设置管理** ❌
   - Settings 表（复用积分配置）
   - 后台管理界面
   - 全局复用积分设置

4. **防刷机制** ❌
   - (B用户ID, 来源作品ID) 唯一奖励
   - 重复点击检测
   - 轻量级告警

---

## 🎯 开发计划（三阶段）

## 里程碑 1：核心闭环（预计 1 周）

### 阶段目标
实现最小可用的作品复用系统：用户 B 可以复用用户 A 的 Prompt，系统正确扣费和奖励。

### 后端任务

#### 1.1 数据库模型扩展 🔴 未开始
**文件**: `prisma/schema.prisma`

**新增表**:
```prisma
// 全局设置表
model Settings {
  id        String   @id @default(cuid())
  key       String   @unique  // "reuse_points_min" | "reuse_points_max" | "reuse_points_current"
  value     String              // JSON 字符串
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 作品来源关系表（内部使用，前端不展示）
model WorkRelation {
  id              String   @id @default(cuid())
  sourceWorkId    String              // 来源作品 ID
  derivativeWorkId String             // 派生作品 ID
  createdAt       DateTime @default(now())

  sourceWork      Asset @relation("SourceWork", fields: [sourceWorkId], references: [id], onDelete: Cascade)
  derivativeWork  Asset @relation("DerivativeWork", fields: [derivativeWorkId], references: [id], onDelete: Cascade)

  @@index([sourceWorkId])
  @@index([derivativeWorkId])
}

// 复用记录表（防止重复奖励）
model ReuseRecord {
  id              String   @id @default(cuid())
  sourceWorkId    String              // 来源作品 ID
  reuserId        String              // 复用者 ID（用户B）
  rewardGranted   Boolean  @default(false)  // 是否已给原作者奖励
  createdAt       DateTime @default(now())

  sourceWork Asset @relation(fields: [sourceWorkId], references: [id], onDelete: Cascade)
  reuser     User  @relation(fields: [reuserId], references: [id], onDelete: Cascade)

  @@unique([sourceWorkId, reuserId])  // 防止同一用户重复复用同一作品
  @@index([sourceWorkId])
  @@index([reuserId])
}
```

**更新 Asset 表**:
```prisma
model Asset {
  // ... 现有字段
  sourceWorks     WorkRelation[] @relation("SourceWork")
  derivativeWorks WorkRelation[] @relation("DerivativeWork")
  reuseRecords    ReuseRecord[]
}

model User {
  // ... 现有字段
  reuseRecords ReuseRecord[]
}
```

**更新 CreditTransaction**:
```prisma
model CreditTransaction {
  // ... 现有字段
  // reason 字段新增类型：
  // - "reuse_charge" (复用扣费)
  // - "reuse_reward" (复用奖励)
  refWorkId  String?  // 关联的作品 ID
  refUserId  String?  // 关联的用户 ID（B用户）
}
```

**任务清单**:
- [ ] 创建 Settings 表
- [ ] 创建 WorkRelation 表
- [ ] 创建 ReuseRecord 表
- [ ] 更新 Asset 关系
- [ ] 更新 User 关系
- [ ] 更新 CreditTransaction 字段
- [ ] 运行 `npx prisma migrate dev --name add_reuse_system`
- [ ] 运行 `npm run prisma:generate`

---

#### 1.2 积分设置 API 🔴 未开始
**文件**: `app/api/settings/reuse-points/route.ts` (新建)

**GET /api/settings/reuse-points** - 获取当前复用积分配置
```typescript
{
  min: 10,
  max: 100,
  current: 50
}
```

**PUT /api/settings/reuse-points** - 更新配置（仅管理员）
```typescript
{
  min?: 10,
  max?: 100,
  current?: 50
}
```

**任务清单**:
- [ ] 实现 GET 端点（读取 Settings 表）
- [ ] 实现 PUT 端点（管理员权限验证）
- [ ] 校验 current 在 [min, max] 范围内
- [ ] 写入审计日志

---

#### 1.3 复用核心 API 🔴 未开始
**文件**: `app/api/assets/[id]/reuse/route.ts` (新建)

**POST /api/assets/:id/reuse** - 点击复用

**请求体**: 无（从会话获取 userId）

**响应**:
```typescript
{
  success: true,
  charged: 50,              // 扣除的积分
  rewardGranted: true,      // 是否给原作者奖励
  prefillData: {
    prompt: "原作品的 Prompt",
    negativePrompt: "...",
    model: "gpt-4",
    size: "1024x1024",
    // ... 其他参数
  }
}
```

**逻辑流程**:
```typescript
1. 验证用户登录
2. 查询作品信息（验证 status == published）
3. 获取当前复用积分配置（reuse_points_current）
4. 检查用户 B 余额是否充足
5. **事务开始**
   a. 扣除 B 用户积分
      - CreditTransaction: { delta: -50, reason: "reuse_charge", refWorkId, refUserId: B }
   b. 查询 ReuseRecord(sourceWorkId, reuserId)
   c. 如果不存在记录（首次复用）:
      - 给 A 用户增加积分
      - CreditTransaction: { delta: +50, reason: "reuse_reward", refWorkId, refUserId: B }
      - ReuseRecord: { rewardGranted: true }
   d. 如果已存在（重复复用）:
      - ReuseRecord: { rewardGranted: false }
6. **事务结束**
7. 返回预填数据
```

**任务清单**:
- [ ] 创建路由文件
- [ ] 实现余额验证
- [ ] 实现事务化扣费逻辑
- [ ] 实现唯一奖励判定
- [ ] 返回预填数据
- [ ] 错误处理（余额不足、作品不存在等）
- [ ] 单元测试

---

#### 1.4 派生作品发布 API 🔴 未开始
**文件**: `app/api/assets/publish-derivative/route.ts` (新建)

**POST /api/assets/publish-derivative**

**请求体**:
```typescript
{
  sourceWorkId: "clxxx",  // 来源作品 ID
  title: "派生作品",
  tags: ["art", "ai"],
  coverUrl: "https://...",
  // ... 其他 Asset 字段
}
```

**逻辑**:
1. 创建新 Asset（派生作品）
2. 创建 WorkRelation(sourceWorkId, derivativeWorkId)
3. **不在前端展示来源信息**（仅内部记录）

**任务清单**:
- [ ] 实现派生作品创建
- [ ] 写入 WorkRelation
- [ ] 验证来源作品存在
- [ ] 返回新作品 ID

---

#### 1.5 删除作品 API 🟡 部分实现
**文件**: `app/api/assets/[id]/route.ts` (扩展)

**DELETE /api/assets/:id**

**逻辑**:
1. 验证权限（作者本人或管理员）
2. 标记 status = "deleted"（软删除）
3. **不回滚**已发生的积分交易
4. 返回成功

**任务清单**:
- [ ] 添加 Asset 表的 status 字段（published | deleted）
- [ ] 实现 DELETE 端点
- [ ] 权限验证（作者或管理员）
- [ ] 审计日志记录

---

### 前端任务

#### 1.6 复用按钮与确认弹窗 🔴 未开始
**文件**: 
- `components/asset/reuse-button.tsx` (新建)
- `components/asset/reuse-dialog.tsx` (新建)

**功能**:
1. 在资产详情页显示"复用"按钮
2. 点击按钮弹出确认对话框
3. 对话框显示：
   - 当前复用积分扣费金额
   - 说明：点击即扣费，对原作者奖励仅首次生效
   - 确认/取消按钮

**任务清单**:
- [ ] 创建 ReuseButton 组件
- [ ] 创建 ReuseDialog 组件
- [ ] 集成到 `/assets/[id]/page.tsx`
- [ ] 处理余额不足提示
- [ ] 防止重复点击

---

#### 1.7 复用后跳转创作面板 🔴 未开始
**文件**: `components/asset/reuse-button.tsx`

**流程**:
1. 用户点击确认复用
2. 调用 `POST /api/assets/:id/reuse`
3. 成功后，跳转到 `/studio`
4. 通过 URL 参数传递预填数据：
   - `/studio?prefill=clxxx` (预填数据 ID)
   - 或直接通过 localStorage 传递

**任务清单**:
- [ ] API 调用集成
- [ ] 跳转逻辑
- [ ] 预填数据传递机制（URL 或 localStorage）
- [ ] 错误处理和 Toast 提示

---

#### 1.8 创作面板预填支持 🔴 未开始
**文件**: `app/(web)/studio/page.tsx` 或相关组件

**功能**:
1. 检测 URL 参数 `?prefill=clxxx`
2. 从 localStorage 或 API 获取预填数据
3. 自动填充：
   - Prompt
   - Negative Prompt
   - 模型选择
   - 图片尺寸
   - 其他参数
4. 显示"已从作品复用"提示

**任务清单**:
- [ ] 检测预填参数
- [ ] 加载预填数据
- [ ] 自动填充表单
- [ ] 显示来源提示
- [ ] 用户可编辑后继续生成

---

#### 1.9 后台积分设置界面 🔴 未开始
**文件**: `app/(web)/admin/settings/page.tsx` (新建)

**功能**:
1. 管理员可设置：
   - 最低复用积分（min）
   - 最高复用积分（max）
   - 当前复用积分（current）
2. 实时验证 current 在 [min, max] 范围
3. 保存后更新数据库

**任务清单**:
- [ ] 创建设置页面
- [ ] 表单验证
- [ ] API 集成
- [ ] 成功/失败提示

---

### 测试任务

#### 1.10 单元测试 🔴 未开始
**文件**: `tests/unit/reuse.test.ts` (新建)

**测试用例**:
- [ ] 复用扣费逻辑正确
- [ ] 首次复用给原作者奖励
- [ ] 重复复用不给奖励，仅扣复用者积分
- [ ] 余额不足时复用失败
- [ ] 事务回滚测试

---

#### 1.11 集成测试 🔴 未开始
**文件**: `tests/integration/reuse-flow.test.ts` (新建)

**测试用例**:
- [ ] 完整复用流程（A 发布 → B 复用 → 扣费 → 奖励）
- [ ] B 重复复用同一作品
- [ ] 删除作品后不可复用

---

#### 1.12 E2E 测试 🔴 未开始
**文件**: `tests/e2e/reuse.spec.ts` (新建)

**测试场景**:
- [ ] 用户 B 浏览作品详情页
- [ ] 点击复用按钮
- [ ] 确认扣费
- [ ] 跳转到创作面板并验证预填数据
- [ ] 生成新作品
- [ ] 发布派生作品

---

## 里程碑 2：可视化与统计（预计 1 周）

### 阶段目标
增强用户体验，提供积分流水、作品统计等可视化功能。

### 后端任务

#### 2.1 作品统计 API 🔴 未开始
**文件**: `app/api/assets/[id]/stats/route.ts` (新建)

**GET /api/assets/:id/stats**

**响应**:
```typescript
{
  views: 1234,
  likes: 56,
  favorites: 23,
  reuseCount: 18,        // 复用次数
  totalRevenue: 900,      // 累计收入积分
  reusers: [              // 复用者列表（仅作者可见）
    { userId: "xxx", userName: "User A", reusedAt: "2025-01-01" }
  ]
}
```

**任务清单**:
- [ ] 实现统计查询
- [ ] 权限控制（复用者列表仅作者可见）
- [ ] 缓存优化

---

#### 2.2 用户积分流水 API 🟡 部分实现
**文件**: `app/api/credits/transactions/route.ts` (扩展)

**GET /api/credits/transactions?type=reuse**

**功能**:
- 筛选类型：reuse_charge, reuse_reward, 其他
- 分页支持
- 按时间排序

**任务清单**:
- [ ] 添加类型筛选
- [ ] 添加作品关联信息（refWorkId）
- [ ] 前端适配

---

### 前端任务

#### 2.3 个人中心积分流水页 🔴 未开始
**文件**: `app/(web)/profile/transactions/page.tsx` (新建)

**功能**:
1. 展示用户所有积分交易
2. 分类标签：充值、扣费、奖励、复用
3. 每条记录显示：
   - 时间
   - 类型
   - 金额（+/-）
   - 关联作品（可点击跳转）
4. 分页或无限滚动

**任务清单**:
- [ ] 创建交易流水页面
- [ ] API 集成
- [ ] 筛选和排序
- [ ] 关联作品链接

---

#### 2.4 作品统计展示 🔴 未开始
**文件**: `app/(web)/assets/[id]/page.tsx` (扩展)

**功能**:
1. 在资产详情页显示统计数据
2. 作者视角额外显示：
   - 复用次数
   - 累计收入积分
   - 复用者列表（可选）

**任务清单**:
- [ ] 集成统计 API
- [ ] 区分作者和访客视图
- [ ] 复用次数图表（可选）

---

#### 2.5 风控埋点和日志 🔴 未开始
**文件**: 
- `lib/analytics.ts` (新建)
- 后端各 API

**功能**:
1. 记录复用点击事件：
   - 时间戳
   - 用户 ID
   - 作品 ID
   - IP 地址
   - User-Agent
2. 异常检测：
   - 短时间内高频复用（同一用户）
   - 短时间内被高频复用（同一作品）

**任务清单**:
- [ ] 创建埋点工具库
- [ ] 后端日志记录
- [ ] 简单阈值告警（控制台日志）
- [ ] 管理后台查看日志（可选）

---

## 里程碑 3：体验与安全（预计 1 周）

### 阶段目标
完善用户体验，增强安全性，预留未来扩展钩子。

### 前端任务

#### 3.1 复用确认弹窗优化 🔴 未开始
**文件**: `components/asset/reuse-dialog.tsx`

**功能**:
1. 二次确认机制：
   - 滑块确认（防误触）
   - 或倒计时按钮（3秒后可点击）
2. 显示清晰的扣费说明
3. 余额实时显示

**任务清单**:
- [ ] 添加滑块确认组件
- [ ] 或倒计时按钮
- [ ] 余额不足红色警告
- [ ] 防止快速重复点击

---

#### 3.2 移动端适配 🔴 未开始
**功能**:
- 复用弹窗在移动端友好显示
- 滑块/按钮适配触摸操作

**任务清单**:
- [ ] 响应式布局测试
- [ ] 触摸事件优化
- [ ] 小屏幕字体调整

---

### 后端任务

#### 3.3 审核钩子预留 🔴 未开始
**文件**: `lib/moderation.ts` (新建)

**功能**:
1. 在发布 API 中预留审核钩子
2. 当前默认：auto-approve
3. 未来可扩展：
   - 敏感词检测
   - 图像内容审核
   - 人工审核队列

**任务清单**:
- [ ] 创建审核工具库
- [ ] 在 publish API 中调用
- [ ] 默认返回通过
- [ ] 添加配置开关（环境变量）

---

#### 3.4 数据备份与回滚 🔴 未开始
**功能**:
1. 定期数据库备份脚本
2. 积分交易备份（不可回滚，但可查询历史）

**任务清单**:
- [ ] 编写备份脚本
- [ ] 部署自动化任务（cron）
- [ ] 文档化恢复流程

---

#### 3.5 速率限制 🟡 部分实现
**文件**: `lib/rate-limit.ts` (扩展)

**功能**:
- 复用 API 限流：60 秒 / 10 次
- 按 IP 或用户 ID 限制

**任务清单**:
- [ ] 复用 API 添加限流中间件
- [ ] 返回 429 状态码
- [ ] 前端友好提示

---

## 验收标准（Acceptance Criteria）

### 里程碑 1 验收
- [ ] 用户 B 点击复用，余额充足时成功扣费
- [ ] 首次复用：B 扣费，A 得奖励
- [ ] 重复复用：B 扣费，A 不得奖励
- [ ] 余额不足时，复用失败并提示
- [ ] 复用后跳转创作面板，Prompt 自动预填
- [ ] B 可基于预填数据生成新作品
- [ ] B 可发布派生作品（前端不显示来源）
- [ ] 作者或管理员可删除作品，已发生的积分不回滚
- [ ] 后台可设置复用积分（min, max, current）

### 里程碑 2 验收
- [ ] 个人中心显示积分流水，可筛选复用类型
- [ ] 作品详情页显示统计数据（复用次数、收入）
- [ ] 作者可查看复用者列表
- [ ] 异常高频复用有日志记录

### 里程碑 3 验收
- [ ] 复用弹窗有二次确认（滑块或倒计时）
- [ ] 移动端操作流畅
- [ ] API 有速率限制
- [ ] 预留审核钩子，可通过配置启用

---

## 开发顺序建议

### 第 1 周（里程碑 1）
**Day 1-2**: 数据库模型 + 迁移
- 1.1 数据库模型扩展

**Day 3**: 积分设置
- 1.2 积分设置 API

**Day 4-5**: 复用核心逻辑
- 1.3 复用核心 API
- 1.4 派生作品发布 API
- 1.5 删除作品 API

**Day 6-7**: 前端集成
- 1.6 复用按钮与确认弹窗
- 1.7 复用后跳转创作面板
- 1.8 创作面板预填支持
- 1.9 后台积分设置界面

**测试**:
- 1.10 单元测试
- 1.11 集成测试
- 1.12 E2E 测试

---

### 第 2 周（里程碑 2）
**Day 1-2**: 统计 API
- 2.1 作品统计 API
- 2.2 用户积分流水 API

**Day 3-4**: 前端可视化
- 2.3 个人中心积分流水页
- 2.4 作品统计展示

**Day 5**: 风控与日志
- 2.5 风控埋点和日志

---

### 第 3 周（里程碑 3）
**Day 1-2**: 体验优化
- 3.1 复用确认弹窗优化
- 3.2 移动端适配

**Day 3-4**: 安全与扩展
- 3.3 审核钩子预留
- 3.4 数据备份与回滚
- 3.5 速率限制

**Day 5**: 集成测试与文档
- 完整流程回归测试
- 用户文档编写
- 部署前检查

---

## 技术债务与优化方向

### 性能优化
- [ ] 复用记录查询索引优化
- [ ] 积分交易分页查询优化
- [ ] 作品统计数据缓存（Redis）

### 代码质量
- [ ] 复用逻辑抽离为独立服务类
- [ ] 统一错误处理和响应格式
- [ ] TypeScript 类型完善

### 安全增强
- [ ] CSRF 保护
- [ ] SQL 注入防护（Prisma 已提供）
- [ ] 输入验证和清洗

### 可观测性
- [ ] 接入 APM 监控（如 Sentry）
- [ ] 积分交易异常告警
- [ ] 性能指标追踪

---

## 部署前检查清单

### 数据库
- [ ] 所有迁移已应用（`npx prisma migrate deploy`）
- [ ] Prisma Client 已生成（`npm run prisma:generate`）
- [ ] 生产数据库备份

### 环境变量
- [ ] `REUSE_POINTS_MIN` 配置
- [ ] `REUSE_POINTS_MAX` 配置
- [ ] `REUSE_POINTS_CURRENT` 配置
- [ ] 其他必需环境变量

### 代码质量
- [ ] TypeScript 编译通过
- [ ] Lint 检查通过
- [ ] 所有测试通过

### 功能测试
- [ ] 手动测试复用流程
- [ ] 测试余额不足场景
- [ ] 测试重复复用场景
- [ ] 测试删除作品后的状态

---

## 总结

本开发计划基于 AIRelease.md 的功能设计，将复用系统分为三个里程碑：

1. **核心闭环**（1周）：实现最小可用功能
2. **可视化与统计**（1周）：增强用户体验
3. **体验与安全**（1周）：完善细节和安全性

总开发周期：**3 周**

每个里程碑都有明确的任务清单和验收标准，便于跟踪进度和质量保证。

**当前状态**：已完成基础发布系统，复用功能尚未开始开发。

**下一步**：从里程碑 1 的数据库模型扩展开始（任务 1.1）。
