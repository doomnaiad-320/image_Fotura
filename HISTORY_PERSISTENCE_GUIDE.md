# 历史记录持久化问题排查和解决方案

## 🎯 问题描述

用户反馈:刷新页面后,历史记录消失了。

## 🔍 技术原理

### 当前架构分析

你的项目**已经实现了完善的持久化存储**:

```typescript
// 数据存储层级
1. IndexedDB (持久化) ✅
   └─ images 表: 存储图片 Blob
   └─ history 表: 存储元数据(prompt, model, timestamp 等)

2. BlobManager (内存缓存) ⚠️
   └─ urlCache: imageId → blob:// URL 映射
   └─ 问题: 页面刷新后内存清空

3. React State (临时) ❌
   └─ history: GeneratedImage[] 数组
   └─ 问题: 刷新后重置
```

### 为什么会看起来"丢失"?

**原因 1: Blob URL 的生命周期**

```javascript
// 页面加载时
URL.createObjectURL(blob) → "blob:http://localhost:3000/abc-123"
                                          ↑ 临时内存地址

// 页面刷新后
上面的 URL 失效 → 图片显示空白 ❌
但 IndexedDB 中的 Blob 数据还在 ✅
```

**原因 2: 懒加载机制**

你的代码已经实现了重新加载:

```typescript
// lib/hooks/useLocalHistory.ts: 45-76行
async function historyStoreToGeneratedImage(...) {
  // 1. 检查内存缓存
  let blobUrl = blobManager.getCachedURL(historyStore.imageId);
  
  // 2. 缓存未命中 → 从 IndexedDB 加载 ✅
  if (!blobUrl) {
    const blob = await db.getThumbnail(historyStore.imageId);
    if (blob) {
      blobUrl = blobManager.createObjectURL(blob, historyStore.imageId);
    }
  }
  
  return { id, url: blobUrl, ... };
}
```

**理论上刷新后应该自动恢复!** 🤔

---

## 🐛 可能的 Bug 来源

### Bug 1: useEffect 时机问题

检查 `components/ai/playground-advanced.tsx`:

```typescript
// 问题: useLocalHistory 的 history 可能在组件挂载前为空
const { history } = useLocalHistory();

// handleUseImageAsInput 查找历史记录
const historyItem = history.find(h => h.url === imageUrl);
```

**症状**: 如果 `history` 还在加载中(`loading: true`),`find()` 会找不到。

### Bug 2: 浏览器隐私模式

IndexedDB 在隐私模式/无痕模式下**不持久化**:

```javascript
// Chrome 隐私模式
sessionStorage ✅ 可用
localStorage  ✅ 可用
IndexedDB     ⚠️ 会话结束后清空
```

### Bug 3: 存储配额限制

浏览器可能清理 IndexedDB:

- Safari: 7 天未访问自动清理
- Firefox: 50MB 后提示用户
- Chrome: 存储空间不足时清理

---

## ✅ 解决方案

### 方案 1: 检查浏览器环境 (立即测试)

打开浏览器控制台,运行:

```javascript
// 1. 检查 IndexedDB 支持
console.log('IndexedDB 支持:', !!window.indexedDB);

// 2. 查看已存储的数据
const request = indexedDB.open('aigc-studio-local', 1);
request.onsuccess = () => {
  const db = request.result;
  const tx = db.transaction(['history'], 'readonly');
  const store = tx.objectStore('history');
  const count = store.count();
  count.onsuccess = () => {
    console.log('历史记录数量:', count.result);
  };
};

// 3. 检查是否是隐私模式
window.indexedDB.open('test').onerror = function() {
  console.log('⚠️ 可能在隐私模式下运行');
};
```

### 方案 2: 添加加载状态提示 (UX改进)

修改 `history-panel.tsx`:

```typescript
const HistoryPanel: React.FC<HistoryPanelProps> = ({ ... }) => {
  const { history, loading } = useLocalHistory();
  
  return (
    <div className="flex-grow overflow-y-auto p-4">
      {loading ? (
        <div className="text-center text-gray-400 pt-10">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2" ... />
          <p>加载历史记录中...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center text-gray-400 pt-10">
          <p>暂无生成历史</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => <HistoryItem ... />)}
        </div>
      )}
    </div>
  );
};
```

### 方案 3: 增加错误恢复机制

在 `useLocalHistory.ts` 中添加:

```typescript
const loadHistory = useCallback(async () => {
  try {
    setLoading(true);
    const db = await getDB();
    const historyList = await db.getHistory(100);
    
    // 批量加载图片(带重试)
    const images = await Promise.allSettled(
      historyList.map(h => historyStoreToGeneratedImage(h, blobManagerRef.current))
    );
    
    const successImages = images
      .filter((r): r is PromiseFulfilledResult<GeneratedImage> => 
        r.status === 'fulfilled' && !!r.value.url
      )
      .map(r => r.value);
    
    // 记录失败的项
    const failed = images.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`${failed.length} 条历史记录加载失败`);
    }
    
    setHistory(successImages);
  } catch (err) {
    console.error('加载历史记录失败:', err);
    setError(err as Error);
  } finally {
    setLoading(false);
  }
}, [supported]);
```

### 方案 4: 添加调试日志

在 `useLocalHistory.ts` 的关键位置添加日志:

```typescript
// 在 useEffect 中
useEffect(() => {
  console.log('[History] 开始加载历史记录');
  loadHistory().then(() => {
    console.log('[History] 加载完成,数量:', history.length);
  });
  loadStats();
  
  return () => {
    isMountedRef.current = false;
    console.log('[History] 组件卸载');
  };
}, [loadHistory, loadStats]);

// 在 historyStoreToGeneratedImage 中
async function historyStoreToGeneratedImage(...) {
  const blobUrl = blobManager.getCachedURL(historyStore.imageId);
  
  if (!blobUrl) {
    console.log('[History] 缓存未命中,从 IndexedDB 加载:', historyStore.imageId);
    const blob = await db.getThumbnail(historyStore.imageId);
    if (blob) {
      const newUrl = blobManager.createObjectURL(blob, historyStore.imageId);
      console.log('[History] 加载成功:', newUrl.slice(0, 30) + '...');
      return newUrl;
    } else {
      console.error('[History] 图片不存在:', historyStore.imageId);
    }
  }
  
  return { id, url: blobUrl || '', ... };
}
```

---

## 🧪 测试步骤

### 步骤 1: 验证 IndexedDB 持久化

```bash
# 1. 启动开发服务器
npm run dev

# 2. 生成几张图片

# 3. 打开浏览器 DevTools → Application → Storage → IndexedDB
#    查看 aigc-studio-local 数据库
#    - images 表应该有 Blob 数据
#    - history 表应该有元数据

# 4. 刷新页面 F5

# 5. 再次查看 IndexedDB
#    → 数据应该还在 ✅

# 6. 查看 Console 日志
#    → 应该看到 "[History] 开始加载历史记录"
#    → 应该看到 "[History] 加载完成"
```

### 步骤 2: 检查 Blob URL 重建

```javascript
// 在刷新前的 Console
console.log('刷新前:', history[0].url);
// 输出: "blob:http://localhost:3000/abc-123"

// 刷新后的 Console
console.log('刷新后:', history[0].url);
// 输出: "blob:http://localhost:3000/def-456" (新的URL,内容相同)
```

### 步骤 3: 测试"作为输入"功能

```bash
# 1. 生成图片A
# 2. 点击"作为输入"
# 3. 验证 Prompt 继承 ✅
# 4. 刷新页面 F5
# 5. 打开历史面板
# 6. 点击图片A的"使用"按钮
# 7. 验证:
#    - 图片A加载到编辑器 ✅
#    - Prompt 正确继承 ✅
```

---

## 🛡️ 隐私保护方案对比

### 当前方案: 纯本地存储 (IndexedDB)

**优点**:
- ✅ 100% 隐私保护(数据不离开用户设备)
- ✅ 无网络请求,速度快
- ✅ 离线可用
- ✅ 无需服务器存储成本

**缺点**:
- ⚠️ 跨设备不同步
- ⚠️ 浏览器清理数据后丢失
- ⚠️ 无法分享给其他用户

### 备选方案 A: 混合存储

```typescript
// 1. 默认本地存储(隐私优先)
IndexedDB → 立即可用

// 2. 可选云端备份(用户明确同意)
用户点击"备份到云端" → 
  上传到服务器(加密) → 
  跨设备同步

// 3. 数据所有权
用户可随时:
  - 查看服务端数据
  - 下载所有数据(导出为 ZIP)
  - 删除服务端数据
```

### 备选方案 B: 端到端加密

```typescript
// 1. 用户设置密码
password → 派生加密密钥

// 2. 上传前加密
图片 + 元数据 → AES-256-GCM 加密 → 上传

// 3. 服务器无法解密
服务器只存储密文,无法查看内容

// 4. 下载后解密
下载密文 → 用户密码解密 → 显示
```

### 备选方案 C: 仅元数据上云

```typescript
// 1. 图片完全本地(IndexedDB)
blob → 永不上传

// 2. 元数据云端备份
{
  historyId,
  prompt,      // 明文(用户愿意分享)
  model,
  timestamp,
  imageHash    // 用于去重,不含图片内容
}

// 3. 跨设备行为
- 设备A: 生成图片,保存本地 + 上传元数据
- 设备B: 看到提示词历史,无图片(可选重新生成)
```

---

## 🎯 推荐实施计划

### 阶段 1: 立即修复 (本周)

1. ✅ **已有**: IndexedDB 持久化
2. ✅ **已有**: Blob URL 懒加载
3. ⚠️ **改进**: 添加加载状态提示
4. ⚠️ **改进**: 添加错误恢复
5. ⚠️ **调试**: 添加日志确认问题

### 阶段 2: 用户体验优化 (下周)

1. 🔜 添加"导出历史记录"功能(ZIP 下载)
2. 🔜 添加"导入历史记录"功能(恢复数据)
3. 🔜 添加"清理旧记录"功能(节省空间)
4. 🔜 显示存储使用情况(已用/总量)

### 阶段 3: 可选云端同步 (未来)

1. 🔜 用户明确同意后启用
2. 🔜 端到端加密选项
3. 🔜 选择性备份(只备份收藏)
4. 🔜 跨设备同步

---

## 📊 存储容量规划

### 浏览器限制

| 浏览器 | IndexedDB 限制 | 清理策略 |
|--------|---------------|----------|
| Chrome | 可用磁盘的 60% | 配额满时提示 |
| Firefox | 总共 50MB | 达到 10% 磁盘空间时 |
| Safari | 1GB | 7天未访问清理 |
| Edge | 同 Chrome | 配额满时提示 |

### 存储估算

```
单张图片存储:
- 原图 (1024x1024 PNG): ~1-2 MB
- 缩略图 (100x100): ~20 KB
- 元数据: ~1 KB

100 张历史记录 ≈ 100-200 MB
```

### 自动清理策略

```typescript
// lib/storage/indexeddb.ts 已实现
await db.clearOldHistory(beforeTimestamp);

// 推荐配置
clearOldDays(30);  // 保留最近30天(非收藏)
// 收藏的永久保留
```

---

## 🔧 立即可执行的调试

```bash
# 1. 检查当前存储状态
open http://localhost:3000
# F12 → Application → IndexedDB → aigc-studio-local

# 2. 查看历史记录数量
# Console 输入:
const db = await (await import('/lib/storage/indexeddb')).getDB();
const stats = await db.getStorageStats();
console.log(stats);

# 3. 手动触发加载
# Console 输入:
const { useLocalHistory } = await import('/lib/hooks/useLocalHistory');
// 在 React 组件中调用
```

---

## ✨ 总结

**好消息**: 你的代码架构**已经非常完善**!

**问题根源**: 可能是:
1. 加载时机问题(React 渲染顺序)
2. 浏览器环境问题(隐私模式/配额)
3. 错误未捕获(静默失败)

**推荐行动**:
1. 🔍 **先诊断**: 按照测试步骤确认问题
2. 🐛 **再修复**: 根据诊断结果选择方案
3. 📈 **优化**: 添加加载状态和错误提示

**隐私保护**: 当前的 IndexedDB 方案已经是**最佳隐私保护方案**!

---

**需要帮助吗?** 提供以下信息可以更精准定位:
- 浏览器版本(Chrome/Safari/Firefox?)
- 是否隐私模式?
- Console 有错误吗?
- 刷新前后 IndexedDB 数据是否还在?
