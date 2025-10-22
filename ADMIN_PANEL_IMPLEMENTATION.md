# 管理后台实现说明

本文档描述了新实现的管理后台功能，包括可配置的新用户注册赠送积分和传统的面板样式UI。

## 实现概览

### 1. 可配置的新用户注册赠送积分

**问题**: 之前新用户注册赠送的积分（5000）是硬编码在代码中的。

**解决方案**: 
- 使用数据库 `Settings` 表存储系统配置
- 创建设置服务层统一管理系统配置
- 在管理后台提供配置界面

#### 新增文件

##### `lib/settings.ts` - 系统设置服务层
提供统一的设置读写接口：
- `getSetting()` - 获取单个设置
- `setSetting()` - 更新单个设置
- `getSettingInt()` / `setSettingInt()` - 整数类型设置的便捷方法
- `getRegistrationBonusCredits()` - 获取注册赠送积分
- `setRegistrationBonusCredits()` - 设置注册赠送积分
- `getSettings()` - 批量获取多个设置

##### `app/api/admin/settings/route.ts` - 管理后台设置API
- `GET /api/admin/settings` - 获取所有系统设置
- `PUT /api/admin/settings` - 更新系统设置

#### 修改文件

##### `lib/auth.ts`
- 在 `registerUser()` 函数中，将硬编码的 `5_000` 替换为从设置中读取
- 首位用户（管理员）仍固定为 100,000 积分

```typescript
const bonusCredits = isFirstUser ? 100_000 : await getRegistrationBonusCredits();
```

##### `lib/seeds.ts`
- 在数据库初始化时添加默认设置值
- 清空数据库时也会清空 `Settings` 表

```typescript
await prisma.settings.create({
  data: {
    key: "registration_bonus_credits",
    value: "5000"
  }
});
```

### 2. 传统管理后台面板UI

**需求**: 左侧导航 + 主内容区的传统后台UI，包含多个功能页面。

**实现**: 
- 创建统一的管理后台布局
- 实现多个管理页面（概览、AI管理、用户管理、系统设置等）
- 使用 Tailwind CSS 实现深色主题设计

#### 新增文件

##### `app/(web)/admin/layout.tsx` - 管理后台统一布局
- **左侧导航栏**: 固定宽度（256px），深色背景
  - Logo 区域
  - 导航菜单（概览、AI管理、用户管理、资产管理、系统设置、操作日志）
  - 底部用户信息展示
- **主内容区**: 自适应宽度，滚动区域
  - 最大宽度 1280px，居中显示
  - 内边距 32px
- **权限控制**: 自动验证管理员身份，非管理员重定向

导航菜单项：
```typescript
const navItems = [
  { name: "概览", href: "/admin", icon: LayoutDashboard },
  { name: "AI 管理", href: "/admin/ai", icon: Brain },
  { name: "用户管理", href: "/admin/users", icon: Users },
  { name: "资产管理", href: "/admin/assets", icon: ImageIcon },
  { name: "系统设置", href: "/admin/settings", icon: Settings },
  { name: "操作日志", href: "/admin/logs", icon: FileText },
];
```

##### `app/(web)/admin/page.tsx` - 管理概览页
- **统计卡片**: 显示关键指标
  - 用户总数
  - 资产总数
  - AI 提供商数量
  - AI 模型数量
  - 积分消耗总量
- **快速导航**: 链接到常用功能页面

##### `app/(web)/admin/settings/page.tsx` - 系统设置页
- **表单界面**: 配置系统参数
  - 新用户注册赠送积分
  - 实时验证和保存
  - 成功/错误消息提示
- **使用方式**:
  1. 修改积分数值
  2. 点击"保存设置"按钮
  3. 新注册用户将获得配置的积分数

##### `app/(web)/admin/users/page.tsx` - 用户管理页
- **搜索功能**: 按邮箱或用户名搜索
- **用户列表表格**:
  - 用户信息（头像、名称、邮箱）
  - 角色标识（管理员/普通用户）
  - 积分余额
  - 注册时间
  - 最后更新时间
- **统计信息**: 显示用户总数、管理员数量、普通用户数量

##### 已存在的页面
- `app/(web)/admin/ai/page.tsx` - AI 管理页（已存在）
  - 管理 AI 提供商和模型

## 使用说明

### 初始化数据库

如果是新数据库或需要重置：

```bash
# 重置数据库并初始化默认设置
npm run seed:reset
```

这将：
1. 清空所有数据
2. 创建管理员和普通用户
3. 初始化 AI 提供商和模型
4. **创建默认设置**（`registration_bonus_credits = 5000`）

### 访问管理后台

1. 使用管理员账号登录：
   - 邮箱: `admin@aigc.studio`
   - 密码: `Admin123!@#`

2. 访问管理后台：
   - 主页: `http://localhost:3000/admin`
   - AI 管理: `http://localhost:3000/admin/ai`
   - 用户管理: `http://localhost:3000/admin/users`
   - 积分日志: `http://localhost:3000/admin/logs`
   - 系统设置: `http://localhost:3000/admin/settings`

### 修改注册赠送积分

1. 访问 `/admin/settings`
2. 在"新用户注册赠送积分"输入框中修改数值
3. 点击"保存设置"按钮
4. 新用户注册时将自动获得配置的积分数

### API 使用

#### 获取系统设置
```bash
GET /api/admin/settings
Authorization: 需要管理员权限
```

响应示例：
```json
{
  "settings": {
    "registration_bonus_credits": 5000
  }
}
```

#### 更新系统设置
```bash
PUT /api/admin/settings
Content-Type: application/json
Authorization: 需要管理员权限

{
  "key": "registration_bonus_credits",
  "value": 10000
}
```

## 技术实现细节

### 数据库设计

使用现有的 `Settings` 表（已在 schema.prisma 中定义）：

```prisma
model Settings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 设置键定义

在 `lib/settings.ts` 中统一定义：

```typescript
export const SETTINGS_KEYS = {
  REGISTRATION_BONUS_CREDITS: "registration_bonus_credits",
} as const;
```

### 权限控制

所有管理后台页面和 API 都使用 `ensureAdmin()` 进行权限验证：

```typescript
const user = await getCurrentUser();
if (!user) {
  redirect("/auth/signin?redirect=/admin");
}

try {
  ensureAdmin(user.role);
} catch {
  redirect("/");
}
```

## UI 设计

### 配色方案

- **背景**: `bg-gray-950` / `bg-gray-900`
- **边框**: `border-gray-800` / `border-gray-700`
- **文字**: `text-white` / `text-gray-300` / `text-gray-400`
- **主色调**: `bg-blue-600` (按钮等)
- **角色标识**:
  - 管理员: 紫色 (`purple-400`)
  - 普通用户: 蓝色 (`blue-400`)

### 响应式设计

- 统计卡片: 支持 1-5 列自适应布局
- 导航栏: 固定宽度，移动端可优化为抽屉式
- 表格: 水平滚动支持

### 图标库

使用 `lucide-react`:
- LayoutDashboard - 概览
- Brain - AI 管理
- Users - 用户管理
- Receipt - 积分日志
- Settings - 系统设置
- CoinsIcon - 积分
- TrendingUp/TrendingDown - 积分变动
- CheckCircle/Clock/AlertCircle/RefreshCw - 交易状态
- Search - 搜索

## 扩展建议

### 未来可添加的设置项

在 `lib/settings.ts` 中添加新的设置键：

```typescript
export const SETTINGS_KEYS = {
  REGISTRATION_BONUS_CREDITS: "registration_bonus_credits",
  // 新增设置项示例
  MAX_UPLOAD_SIZE: "max_upload_size",
  ENABLE_PUBLIC_REGISTRATION: "enable_public_registration",
  DEFAULT_AI_MODEL: "default_ai_model",
} as const;
```

### 用户管理扩展

可以添加：
- 用户积分调整功能（已有 API 支持）
- 用户角色修改
- 批量操作
- 用户活动日志查看

### 操作审计日志（未实现）

可以创建 `/admin/audit-logs` 页面，实现：
- 查看 `AuditLog` 表数据（用户行为审计）
- 筛选和搜索（按用户、操作类型、时间范围）
- 导出日志

### 积分日志增强

当前已实现基础功能，可进一步添加：
- 按用户筛选（点击用户名快速筛选该用户的所有交易）
- 按时间范围筛选
- 导出为 CSV 或 Excel
- 交易详情弹窗（显示完整的 metadata）

## 测试建议

1. **功能测试**:
   - 修改注册赠送积分 → 新用户注册 → 验证获得正确积分
   - 搜索用户功能
   - 权限控制（非管理员访问）

2. **边界测试**:
   - 设置负数积分（应拒绝）
   - 设置超大数值
   - 并发修改设置

3. **UI 测试**:
   - 不同屏幕尺寸的响应式表现
   - 导航高亮状态
   - 加载状态展示

## 注意事项

1. **首位用户特殊处理**: 首位用户（管理员）的积分固定为 100,000，不受配置影响。

2. **设置默认值**: 如果数据库中没有设置记录，系统会使用默认值 5000。

3. **权限要求**: 所有管理后台功能都需要管理员权限（`role = "admin"`）。

4. **实时生效**: 修改设置后，新注册的用户立即使用新配置，无需重启服务。

5. **数据持久化**: 所有设置存储在数据库中，重启服务或重新部署后设置仍然有效。

## 相关文件清单

### 新增文件
- `lib/settings.ts` - 设置服务层
- `app/api/admin/settings/route.ts` - 设置 API
- `app/api/admin/credit-logs/route.ts` - 积分日志 API
- `app/(web)/admin/layout.tsx` - 管理后台布局
- `app/(web)/admin/page.tsx` - 管理概览页
- `app/(web)/admin/settings/page.tsx` - 系统设置页
- `app/(web)/admin/users/page.tsx` - 用户管理页
- `app/(web)/admin/logs/page.tsx` - 积分日志页
- `ADMIN_PANEL_IMPLEMENTATION.md` - 本文档

### 修改文件
- `lib/auth.ts` - 使用可配置的注册积分
- `lib/seeds.ts` - 初始化默认设置

### 已存在的相关文件
- `prisma/schema.prisma` - Settings 表定义（已存在）
- `app/(web)/admin/ai/page.tsx` - AI 管理页（已存在）
- `app/api/admin/users/route.ts` - 用户 API（已存在）
