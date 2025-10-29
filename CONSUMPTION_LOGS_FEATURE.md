# 消费日志功能

## 概述
在个人主页 (`/me`) 中添加了完整的消费日志功能,用户可以查看所有的积分消费和充值记录,支持时间筛选和详细统计。

## 功能特性

### 1. 统计概览
显示四个关键统计指标:
- **总记录数**: 当前筛选条件下的交易记录总数
- **已消费**: 所有消费(debit)和预扣(precharge)的总和
- **已充值**: 所有充值(credit)的总和
- **净变化**: 充值 - 消费的差额,正数为盈余,负数为亏损

### 2. 时间筛选
#### 快捷筛选按钮
- 最近7天
- 最近30天
- 最近90天
- 全部时间

#### 自定义日期范围
- 开始日期选择器
- 结束日期选择器
- 应用筛选按钮

### 3. 交易记录表格
显示详细的交易信息:
- **时间**: 交易创建时间 (YYYY-MM-DD HH:mm)
- **类型**: 消费/充值/预扣/退款
- **金额**: 交易金额 (带正负号)
- **余额变化**: 交易前 → 交易后
- **原因**: 交易原因说明
- **状态**: 待处理/已完成/已取消

### 4. 分页功能
- 每页显示20条记录
- 上一页/下一页按钮
- 显示当前页数和总页数
- 显示当前记录范围

## 技术实现

### 前端组件
**文件**: `components/settings/consumption-history.tsx`

主要功能:
- React Hooks 状态管理 (transactions, pagination, statistics, dateRange)
- 时间筛选逻辑 (快捷筛选和自定义范围)
- 响应式布局 (移动端和桌面端适配)
- 加载状态和错误处理

### 后端 API
**文件**: `app/api/credits/history/route.ts`

**接口**: `GET /api/credits/history`

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `startDate`: 开始日期 (可选, 格式: YYYY-MM-DD)
- `endDate`: 结束日期 (可选, 格式: YYYY-MM-DD)

**返回数据**:
```typescript
{
  transactions: CreditTransaction[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  statistics: {
    totalRecords: number,
    totalSpent: number,
    totalEarned: number,
    netChange: number
  }
}
```

### 数据库查询优化
- 使用 Prisma 并行查询 (`Promise.all`) 提高性能
- 分离分页数据和统计数据查询
- 仅统计已完成 (success) 和已退款 (refunded) 的交易
- 支持时间范围筛选 (`createdAt.gte` 和 `createdAt.lte`)

## 用户界面

### 个人主页集成
**文件**: `components/me/me-dashboard.tsx`

在原有的3个标签页基础上新增"消费日志"标签:
1. 已发布
2. 已复用
3. 收藏
4. **消费日志** ← 新增

### 样式设计
- 使用 Tailwind CSS 实现响应式布局
- 图标来自 `lucide-react`
- 统计卡片带颜色标识:
  - 已消费: 红色 (text-red-500)
  - 已充值: 绿色 (text-green-500)
  - 净变化: 根据正负动态显示颜色

## 使用场景

### 场景1: 查看近期消费
用户点击"最近7天"按钮,快速查看最近一周的所有交易记录和统计。

### 场景2: 分析特定时间段
用户选择自定义日期范围 (如: 2024-01-01 到 2024-01-31),查看1月份的完整消费情况。

### 场景3: 核对充值记录
用户筛选充值类型的交易,验证所有充值操作是否正确到账。

### 场景4: 追踪消费明细
用户浏览分页记录,查看每笔消费的详细原因 (如: "图片生成预扣"、"对话预扣"等)。

## 数据说明

### 交易类型映射
- `debit`: 消费 (delta < 0, status = success)
- `credit`: 充值 (delta > 0, status = success)
- `precharge`: 预扣 (status = pending)
- `refund`: 退款 (status = refunded)

### 状态映射
- `pending`: 待处理 (预扣状态)
- `success`: 已完成 (正常完成)
- `refunded`: 已完成 (退款后)
- `failed`: 已取消 (失败)

### 余额计算
API 根据用户当前余额和历史 delta 反向计算每条记录的 `balanceBefore` 和 `balanceAfter`。

## 测试建议

### 手动测试
1. 访问 `/me` 页面
2. 点击"消费日志"标签
3. 验证统计数据是否正确
4. 测试各种时间筛选组合
5. 验证分页功能
6. 检查移动端响应式布局

### 测试数据
使用 `npm run seed` 生成测试数据,包括:
- 用户初始积分
- 模拟的消费记录
- 充值记录

## 未来改进方向

1. **导出功能**: 支持导出 CSV 或 Excel 格式
2. **高级筛选**: 按交易类型、状态、金额范围筛选
3. **图表可视化**: 添加消费趋势图、类型分布饼图
4. **搜索功能**: 按原因关键词搜索交易
5. **批量操作**: 批量导出或打印选中记录
6. **实时更新**: WebSocket 实时推送新交易通知

## 相关文件

### 修改的文件
- `components/me/me-dashboard.tsx` - 添加消费日志标签页
- `components/settings/consumption-history.tsx` - 完整重构消费历史组件
- `app/api/credits/history/route.ts` - 增强 API 支持时间筛选和统计

### 依赖的文件
- `lib/http.ts` - HTTP 请求工具
- `lib/prisma.ts` - 数据库客户端
- `lib/auth.ts` - 用户认证
- `prisma/schema.prisma` - CreditTransaction 模型定义

## API 示例

### 查询全部记录
```bash
GET /api/credits/history?page=1&limit=20
```

### 查询最近30天
```bash
GET /api/credits/history?page=1&limit=20&startDate=2024-12-01&endDate=2024-12-31
```

### 响应示例
```json
{
  "transactions": [
    {
      "id": "abc123",
      "type": "debit",
      "amount": 50,
      "balanceBefore": 150,
      "balanceAfter": 100,
      "reason": "图片生成预扣",
      "status": "completed",
      "createdAt": "2024-12-15T10:30:00Z",
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "statistics": {
    "totalRecords": 45,
    "totalSpent": 2300,
    "totalEarned": 5000,
    "netChange": 2700
  }
}
```
