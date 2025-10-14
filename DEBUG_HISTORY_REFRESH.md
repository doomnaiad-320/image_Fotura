# 历史记录刷新问题调试指南

## 已完成的改进

### 1. 增强日志系统

我已经在 `lib/hooks/useLocalHistory.ts` 中添加了详细的调试日志,用于追踪页面刷新后历史记录的加载流程。

#### 关键日志点

**useEffect 初始化:**
```
[useLocalHistory] useEffect 初始化, supported: true/false
```

**loadHistory 函数执行:**
```
[useLocalHistory] loadHistory 开始执行, supported: true
[useLocalHistory] 设置 loading 状态为 true
[useLocalHistory] 准备获取 IndexedDB 实例
[useLocalHistory] IndexedDB 实例获取成功
[useLocalHistory] 开始从数据库读取历史记录(最多100条)
[useLocalHistory] 从数据库读取到 X 条历史记录
```

**历史记录转换:**
```
[useLocalHistory] 开始转换历史记录为 GeneratedImage 格式
[historyStoreToGeneratedImage] 转换开始, imageId: xxx
[historyStoreToGeneratedImage] 缓存查找结果: 命中/未命中
[historyStoreToGeneratedImage] 从 IndexedDB 重新加载缩略图
[historyStoreToGeneratedImage] 缩略图加载结果: 成功 (12345 bytes) / 失败/不存在
[historyStoreToGeneratedImage] 新 Blob URL 创建成功: blob:http://...
```

**状态更新:**
```
[useLocalHistory] 组件仍然挂载, 更新 history state
[useLocalHistory] history state 更新完成
[useLocalHistory] 设置 loading 状态为 false
```

## 测试步骤

### 步骤 1: 生成测试数据

1. 打开应用: http://localhost:3000
2. 进入 AI 工作台,生成 2-3 张图片
3. 观察控制台日志,确认图片成功保存到 IndexedDB
4. 预期看到类似日志:
   ```
   [useLocalHistory] 图片保存到 IndexedDB, imageId: img-1234567890-xxx
   [useLocalHistory] 历史记录保存成功, historyId: hist-1234567890-xxx
   ```

### 步骤 2: 刷新页面测试

1. **按 F5 或 Cmd+R 刷新页面**
2. **立即打开浏览器控制台** (F12)
3. **查找以下日志序列:**

#### 正常流程(历史应该出现):

```
✅ [useLocalHistory] useEffect 初始化, supported: true
✅ [useLocalHistory] loadHistory 开始执行, supported: true
✅ [useLocalHistory] 从数据库读取到 3 条历史记录
✅ [useLocalHistory] 开始转换历史记录为 GeneratedImage 格式
✅ [historyStoreToGeneratedImage] 转换开始, imageId: img-xxx
✅ [historyStoreToGeneratedImage] 缓存查找结果: 未命中
✅ [historyStoreToGeneratedImage] 从 IndexedDB 重新加载缩略图
✅ [historyStoreToGeneratedImage] 缩略图加载结果: 成功 (12345 bytes)
✅ [historyStoreToGeneratedImage] 新 Blob URL 创建成功: blob:http://...
✅ [useLocalHistory] 转换完成, 生成了 3 个图像对象
✅ [useLocalHistory] 组件仍然挂载, 更新 history state
✅ [useLocalHistory] history state 更新完成
```

**结果:** 历史面板应该显示之前保存的图片

#### 异常情况:

##### 情况 A: IndexedDB 不支持
```
❌ [useLocalHistory] IndexedDB 不支持, 终止加载
```
**原因:** 浏览器隐私模式或不支持 IndexedDB
**解决:** 使用正常模式浏览器

##### 情况 B: 数据库为空
```
✅ [useLocalHistory] loadHistory 开始执行, supported: true
✅ [useLocalHistory] 从数据库读取到 0 条历史记录
✅ [useLocalHistory] 转换完成, 生成了 0 个图像对象
```
**原因:** 数据被清空或未成功保存
**解决:** 重新生成图片

##### 情况 C: 缩略图丢失
```
✅ [historyStoreToGeneratedImage] 转换开始, imageId: img-xxx
✅ [historyStoreToGeneratedImage] 缓存查找结果: 未命中
✅ [historyStoreToGeneratedImage] 从 IndexedDB 重新加载缩略图
❌ [historyStoreToGeneratedImage] 缩略图加载结果: 失败/不存在
⚠️  [historyStoreToGeneratedImage] 缩略图不存在, URL 将为空
```
**原因:** 图片数据损坏或被清理
**解决:** 删除该条记录并重新生成

##### 情况 D: 组件过早卸载
```
✅ [useLocalHistory] loadHistory 开始执行, supported: true
✅ [useLocalHistory] 从数据库读取到 3 条历史记录
⚠️  [useLocalHistory] 组件已卸载, 跳过 state 更新
```
**原因:** 路由切换或组件加载问题
**解决:** 检查组件生命周期和路由配置

##### 情况 E: 加载错误
```
❌ [useLocalHistory] 加载历史记录失败: Error: ...
❌ [useLocalHistory] 错误详情: ...
❌ [useLocalHistory] 错误堆栈: ...
```
**原因:** IndexedDB 错误、权限问题等
**解决:** 检查错误详情,可能需要清理浏览器数据

### 步骤 3: 验证 IndexedDB 数据

如果日志显示读取到 0 条记录,但你确信之前保存过:

1. **打开浏览器开发工具**
2. **Application → Storage → IndexedDB**
3. **展开 `aigc-studio-db` 数据库**
4. **查看 `images` 和 `history` 表:**
   - `images` 表: 应该有图片 blob 数据
   - `history` 表: 应该有历史记录元数据
5. **如果表为空:** 说明数据确实丢失了

### 步骤 4: 测试不同浏览器

在以下浏览器测试,确认兼容性:

- ✅ Chrome (推荐)
- ✅ Edge
- ✅ Firefox
- ✅ Safari
- ❌ **隐私模式/无痕模式** (IndexedDB 会话后清空)

## 常见问题诊断

### Q1: 刷新后历史完全不见

**可能原因:**
1. 隐私模式浏览器 → 使用正常模式
2. 浏览器设置"关闭时清除数据" → 关闭该设置
3. IndexedDB 配额被清理 → 检查存储配额
4. 代码未正确调用 `loadHistory` → 检查日志

**排查步骤:**
```
1. 检查日志: [useLocalHistory] useEffect 初始化
2. 检查日志: [useLocalHistory] loadHistory 开始执行
3. 检查日志: [useLocalHistory] 从数据库读取到 X 条历史记录
4. 如果 X = 0, 检查 IndexedDB (Application → Storage)
5. 如果 IndexedDB 也为空, 数据确实丢失
```

### Q2: 历史记录存在但图片不显示

**可能原因:**
1. 缩略图未生成或损坏
2. Blob URL 创建失败
3. 图片渲染组件问题

**排查步骤:**
```
1. 检查日志: [historyStoreToGeneratedImage] 缩略图加载结果
2. 如果"失败/不存在", 删除该条记录重新生成
3. 如果"成功", 检查 Blob URL 创建日志
4. 检查历史面板 UI 是否正确渲染
```

### Q3: 加载很慢

**可能原因:**
1. 历史记录太多(>100条)
2. 图片文件很大
3. 浏览器性能问题

**优化建议:**
```typescript
// 限制加载数量
const historyList = await db.getHistory(20); // 从 100 改为 20

// 使用缩略图(已实现)
const blob = await db.getThumbnail(historyStore.imageId); // ✓ 正确

// 懒加载虚拟滚动
// TODO: 实现无限滚动
```

### Q4: 第一次加载成功,后续刷新失败

**可能原因:**
1. Blob URL 未正确清理导致内存泄漏
2. IndexedDB 事务冲突
3. 浏览器缓存问题

**解决方案:**
```
1. 清除浏览器缓存 (Ctrl+Shift+Delete)
2. 检查 BlobManager 是否正确管理 URL
3. 检查是否有未关闭的 IndexedDB 连接
```

## 调试工具

### 1. 浏览器 DevTools

**查看 IndexedDB:**
```
F12 → Application → Storage → IndexedDB → aigc-studio-db
```

**监控网络请求:**
```
F12 → Network → 筛选 "image"
```

**查看内存使用:**
```
F12 → Memory → 检查 Blob 是否泄漏
```

### 2. 手动测试脚本

在控制台执行以下代码测试 IndexedDB:

```javascript
// 导入数据库
import { getDB } from '@/lib/storage/indexeddb';

// 测试读取历史
const db = await getDB();
const history = await db.getHistory(10);
console.log('历史记录:', history);

// 测试读取图片
const images = await db.getAllImages();
console.log('图片数据:', images);

// 测试统计
const stats = await db.getStorageStats();
console.log('存储统计:', stats);
```

### 3. 性能分析

启用 React DevTools Profiler:
```
npm install -D @react-devtools/profiler
```

查看组件渲染性能,确认 `useLocalHistory` 不会导致过多重新渲染。

## 最佳实践

### 1. 用户数据保护

```typescript
// 定期导出备份
async function exportHistory() {
  const db = await getDB();
  const history = await db.getHistory(1000);
  const images = await db.getAllImages();
  
  const backup = { history, images, version: '1.0' };
  const json = JSON.stringify(backup);
  const blob = new Blob([json], { type: 'application/json' });
  
  // 下载备份文件
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aigc-backup-${Date.now()}.json`;
  a.click();
}
```

### 2. 错误恢复

```typescript
// 在 useLocalHistory 中添加恢复机制
useEffect(() => {
  const handleError = async () => {
    try {
      await loadHistory();
    } catch (err) {
      console.error('加载失败,尝试恢复:', err);
      
      // 尝试清理并重新初始化
      try {
        const db = await getDB();
        await db.clearAll();
        alert('历史记录已损坏,已自动清理。请重新生成内容。');
      } catch (cleanErr) {
        console.error('清理失败:', cleanErr);
        alert('存储系统异常,请尝试清除浏览器数据后重试。');
      }
    }
  };
  
  handleError();
}, []);
```

### 3. 性能监控

```typescript
// 添加性能指标
const startTime = performance.now();
await loadHistory();
const duration = performance.now() - startTime;

if (duration > 1000) {
  console.warn(`历史加载耗时 ${duration}ms, 建议优化`);
}
```

## 后续优化建议

1. **无限滚动:** 实现虚拟列表,只渲染可见区域
2. **懒加载:** 按需加载图片,优先显示最近的
3. **后台同步:** 支持跨设备同步(加密)
4. **离线优先:** Service Worker 缓存优化
5. **数据压缩:** 使用 CompressionStream 压缩大图
6. **自动清理:** 定期清理超过 30 天的非收藏记录

## 相关文档

- `HISTORY_PERSISTENCE_GUIDE.md` - 持久化存储方案
- `lib/storage/indexeddb.ts` - IndexedDB 实现
- `lib/storage/blob-manager.ts` - Blob URL 管理
- `lib/hooks/useLocalHistory.ts` - 历史记录 Hook

## 联系支持

如果问题仍未解决:
1. 导出控制台日志 (右键 → Save as...)
2. 导出 IndexedDB 数据 (Application → Export)
3. 提供浏览器版本和操作系统信息
4. 提交 Issue 到项目仓库

---

**最后更新:** 2025-01-XX  
**版本:** 1.0.0
