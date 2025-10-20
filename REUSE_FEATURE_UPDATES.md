# 复用功能增强实现说明

## 更新内容

本次更新实现了三个核心需求：

### 1. 修复弹窗位置
- **问题**: 复用弹窗显示在点击位置，不够直观
- **解决**: 弹窗现在始终显示在屏幕正中间
- **文件**: `components/asset/reuse-dialog.tsx`

### 2. 详情页 Prompt 显示逻辑
- **免费作品 (reusePoints=0)**: 直接显示完整 Prompt
- **付费作品 (reusePoints>0)**:
  - 未复用用户: Prompt 模糊显示，带锁定图标和提示信息
  - 已复用用户: 显示完整 Prompt
  - 作者本人: 始终显示完整 Prompt
- **文件**: `app/(web)/assets/[id]/page.tsx`

### 3. 发布时设置复用价格
- 新增 "复用所需积分" 输入框
- 支持设置为 0（免费复用）
- 默认值为 50 积分
- **文件**: 
  - `components/ai/conversation/publish-dialog.tsx`
  - `app/api/assets/publish/route.ts`

## 数据库变更

### 新增字段
在 `Asset` 表中添加了 `reusePoints` 字段：

```prisma
reusePoints     Int         @default(50)    // 复用所需积分，0表示免费
```

### 运行迁移

**重要**: 由于当前 Node 版本较旧 (v14.21.3)，无法直接运行 Prisma 命令。请先升级 Node 版本到 18+ 或使用 nvm 切换：

```bash
# 方式 1: 使用 nvm 切换 Node 版本
nvm use 18

# 方式 2: 全局升级 Node
# 访问 https://nodejs.org/ 下载最新 LTS 版本

# 升级后运行迁移
npx prisma migrate dev --name add_asset_reuse_points

# 生成 Prisma Client
npm run prisma:generate
```

如果不想升级 Node 版本，可以手动创建迁移文件：

```bash
# 创建迁移目录
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_add_asset_reuse_points

# 创建迁移 SQL 文件
cat > prisma/migrations/$(date +%Y%m%d%H%M%S)_add_asset_reuse_points/migration.sql << 'EOF'
-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "reusePoints" INTEGER NOT NULL DEFAULT 50;
EOF

# 应用迁移（需要先启动开发服务器或使用更新版本的 Node）
npx prisma migrate deploy
```

## API 变更

### `/api/assets/publish` (POST)
新增请求参数：
```typescript
{
  reusePoints?: number; // 0-10000，默认 50
}
```

### `/api/assets/[id]/reuse` (POST)
- 现在使用作品自己的 `reusePoints` 而非全局设置
- 当 `reusePoints=0` 时，不扣除积分，不给作者奖励
- 仍然会创建 `reuseRecord` 记录，用于判断用户是否已复用

## 测试建议

### 1. 免费复用功能
```bash
# 1. 创建一个作品，设置复用价格为 0
# 2. 登出，用另一个账号查看详情页
# 3. 应该能直接看到完整 Prompt
# 4. 点击复用，应该提示"免费复用成功"，不扣积分
```

### 2. 付费复用功能
```bash
# 1. 创建一个作品，设置复用价格为 100
# 2. 用另一个账号查看详情页
# 3. Prompt 应该模糊显示，并提示需要复用
# 4. 点击复用，扣除 100 积分
# 5. 刷新页面，Prompt 应该完整显示
```

### 3. 弹窗位置
```bash
# 1. 在首页任意位置点击"复用"按钮
# 2. 弹窗应该显示在屏幕正中央
# 3. 在移动端和桌面端都应居中
```

## 受影响的文件清单

### 数据库
- `prisma/schema.prisma` - 添加 reusePoints 字段

### 组件
- `components/asset/reuse-dialog.tsx` - 修复弹窗位置
- `components/asset/reuse-button.tsx` - 支持传递 reusePoints
- `components/asset/asset-card.tsx` - 传递 reusePoints 参数
- `components/ai/conversation/publish-dialog.tsx` - 添加复用价格设置

### 页面
- `app/(web)/assets/[id]/page.tsx` - Prompt 显示逻辑

### API
- `app/api/assets/publish/route.ts` - 处理 reusePoints 字段
- `app/api/assets/[id]/reuse/route.ts` - 使用作品自己的 reusePoints

### 工具库
- `lib/assets.ts` - AssetListItem 类型添加 reusePoints

## 注意事项

1. **数据库迁移必须执行**: 否则会出现字段缺失错误
2. **已发布的旧作品**: 迁移后自动设置 reusePoints=50（默认值）
3. **向下兼容**: 如果 reusePoints 为 null，会使用默认值 50
4. **前端缓存**: 部署后建议清理浏览器缓存，确保加载最新代码

## 后续优化建议

1. 批量修改已有作品的复用价格（管理员功能）
2. 复用价格的推荐值（基于作品热度）
3. 作者修改已发布作品的复用价格
4. 复用历史统计面板（查看哪些作品被复用最多）
