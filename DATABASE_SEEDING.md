# 数据库种子数据管理指南

## 概述

为了避免在开发测试阶段频繁丢失数据库配置（如 AI 模型设置），项目已升级为**智能种子系统**。

## 工作原理

### 默认行为（安全模式）
运行 `npm run seed` 时，系统会：
1. ✅ **检查数据库是否已有数据**
2. ✅ **如果有数据，跳过初始化**，保留所有现有配置
3. ✅ 显示提示信息，告诉你如何强制重置

### 强制重置模式
如果确实需要重置数据库到初始状态：
```bash
npm run seed:reset
```

## 命令对比

| 命令 | 行为 | 使用场景 |
|------|------|----------|
| `npm run seed` | 仅在数据库为空时初始化 | ✅ **日常开发** - 启动项目时安全运行 |
| `npm run seed:reset` | 强制清空并重新初始化 | ⚠️ **完全重置** - 丢弃所有配置和数据 |

## 实际使用示例

### 场景 1：首次启动项目
```bash
# 初始化数据库
npx prisma migrate deploy
npm run prisma:generate

# 导入初始数据（管理员/用户/模型）
npm run seed

# 启动开发服务器
npm run dev
```

### 场景 2：日常开发（已有配置）
```bash
# 重启项目
npm run dev

# 如果想确保数据完整性，可以安全运行
npm run seed  # ✅ 不会清空你的模型配置
```

### 场景 3：需要完全重置
```bash
# 强制重置到初始状态
npm run seed:reset  # ⚠️ 会清空所有数据，包括你的配置
```

### 场景 4：高级 - 自定义密码
```bash
# 设置自定义管理员密码
SEED_ADMIN_PASSWORD="MySecurePass123" npm run seed:reset
```

## 环境变量控制

你可以通过环境变量更灵活地控制种子行为：

```bash
# 强制重置（与 seed:reset 等效）
FORCE_RESET=1 npm run seed

# 自定义密码
SEED_ADMIN_PASSWORD="admin123" SEED_USER_PASSWORD="user123" npm run seed
```

## 数据库迁移最佳实践

### ✅ 推荐工作流
```bash
# 1. 修改 schema.prisma
# 2. 创建迁移
npx prisma migrate dev --name your_migration_name

# 3. 如果是全新数据库，初始化数据
npm run seed

# 4. 启动项目
npm run dev
```

### ❌ 避免的操作
```bash
# 不要使用 prisma migrate reset（会清空数据）
# 除非你确实想重置一切
npx prisma migrate reset  # ⚠️ 危险：清空数据库
```

## 故障排除

### 问题：种子脚本说有数据，但我想重新初始化
```bash
# 解决方案：使用强制重置
npm run seed:reset
```

### 问题：我的模型配置丢失了
```bash
# 检查是否误运行了重置命令
# 如果是，需要重新在管理后台配置

# 前往管理后台
http://localhost:3000/admin/ai

# 使用默认管理员账号登录
# Email: admin@aigc.studio
# Password: Admin123!@#
```

### 问题：数据库文件损坏
```bash
# 完全重建数据库
rm prisma/dev.db
npx prisma migrate deploy
npm run seed:reset
```

## 默认账号

运行种子脚本后，会创建以下账号：

**管理员账号**
- Email: `admin@aigc.studio`
- Password: `Admin123!@#`
- Credits: 100,000

**普通用户账号**
- Email: `user@aigc.studio`
- Password: `User123!@#`
- Credits: 5,000

## 技术细节

### 智能检测逻辑
种子系统通过检查 `User` 表的记录数来判断数据库状态：
- 如果 `count > 0` 且 `forceReset = false`：跳过初始化
- 如果 `count = 0` 或 `forceReset = true`：执行完整初始化

### 代码位置
- 种子逻辑：`lib/seeds.ts` 
- 种子入口：`prisma/seed.ts`
- 配置文件：`package.json` (scripts 部分)

## 总结

🎯 **核心要点**：
- 默认的 `npm run seed` 现在是安全的，不会覆盖你的配置
- 只在真的需要重置时使用 `npm run seed:reset`
- 可以放心在任何时候运行 `npm run seed`，它会智能判断是否需要初始化

如有问题，请查看 `WARP.md` 或联系项目维护者。
