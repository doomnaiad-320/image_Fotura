# IndexedDB 调试指南

## 🐛 问题症状

刷新页面后,历史记录为空,IndexedDB 中也没有数据。

## 🔍 调试步骤

### 步骤 1: 启动开发服务器

```bash
npm run dev
```

### 步骤 2: 打开浏览器控制台

1. 访问 http://localhost:3000
2. 按 `F12` 或 `Cmd+Option+I` (Mac) 打开开发者工具
3. 切换到 **Console** 标签

### 步骤 3: 查看初始化日志

页面加载后,应该看到:

```
[useLocalHistory] useEffect 初始化, supported: true
[useLocalHistory] 开始加载历史记录
[useLocalHistory] 加载完成, 数量: 0
```

**如果看到 `supported: false`**:
- ❌ 浏览器不支持 IndexedDB
- 检查是否在隐私模式/无痕模式下
- 尝试换一个浏览器

### 步骤 4: 测试图片生成

1. 选择一个模型
2. 输入提示词:例如 `一只可爱的橙色小猫`
3. 点击"生成图像"

### 步骤 5: 查看保存日志

生成成功后,**应该看到以下完整的日志链**:

```javascript
// 1. playground-advanced.tsx 开始保存
[History] 开始保存历史记录: {
  imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUh...",
  prompt: "一只可爱的橙色小猫",
  modelSlug: "your-model-slug",
  genMode: "txt2img"
}

// 2. 检查 IndexedDB 支持
[History] IndexedDB 支持, 开始保存...

// 3. useLocalHistory.addHistory 被调用
[useLocalHistory] addHistory 被调用: {
  imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUh...",
  prompt: "一只可爱的橙色小猫",
  supported: true,
  metadata: { model: "...", modelName: "...", mode: "txt2img", size: "1024x1024" }
}

// 4. 开始下载图片
[useLocalHistory] 开始 fetch 图片: data:image/png;base64,iVBORw0KGgoAAAANSUh...

// 5. 图片下载成功
[useLocalHistory] 图片下载成功, 大小: 123456 bytes

// 6. IndexedDB 初始化
[useLocalHistory] 获取 IndexedDB 实例成功

// 7. 生成缩略图
[useLocalHistory] 缩略图生成: 5678 bytes

// 8. 保存图片到 IndexedDB
[useLocalHistory] 图片保存到 IndexedDB, imageId: img-1234567890-abcde

// 9. 创建 Blob URL
[useLocalHistory] Blob URL 创建成功: blob:http://localhost:3000/abc-123-def

// 10. 保存历史记录元数据
[useLocalHistory] 历史记录保存成功, historyId: hist-1234567890-fghij

// 11. 更新 UI
[useLocalHistory] 更新 UI state, 新增一条记录

// 12. 更新统计信息
[useLocalHistory] 统计信息已更新

// 13. playground-advanced.tsx 保存完成
[History] 保存成功! historyId: hist-1234567890-fghij localUrl: blob:http://localhost:3000/xyz-456-uvw
```

---

## ⚠️ 常见错误及解决方案

### 错误 1: 日志在第 2 步停止

```javascript
[History] 开始保存历史记录: {...}
// 没有后续日志
```

**原因**: `storageSupported` 为 `false`

**解决方案**:
1. 检查 `useLocalHistory` 是否正确初始化
2. 检查浏览器是否支持 IndexedDB
3. 在 Console 运行:
   ```javascript
   console.log('IndexedDB 支持:', !!window.indexedDB);
   ```

### 错误 2: 日志在第 4 步停止

```javascript
[useLocalHistory] addHistory 被调用: {...}
// 没有后续日志
```

**原因**: `supported` 为 `false`

**检查**:
```javascript
// 在 playground-advanced.tsx 中检查
console.log('storageSupported:', storageSupported);

// 在控制台直接检查
const { isIndexedDBSupported } = await import('/lib/storage/indexeddb.js');
console.log('支持:', isIndexedDBSupported());
```

### 错误 3: fetch 失败

```javascript
[useLocalHistory] 开始 fetch 图片: data:image/png;base64,...
[useLocalHistory] fetch 失败: 404 Not Found
```

**原因**: 
- 如果是 data URL: 不应该走 fetch,检查逻辑
- 如果是 http URL: 代理 API 失败

**解决方案**:
检查 `isHttp` 判断逻辑:
```typescript
const isHttp = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
// data:image/png... 不应该走代理
```

### 错误 4: IndexedDB 写入失败

```javascript
[useLocalHistory] 图片保存到 IndexedDB, imageId: img-...
// 报错: QuotaExceededError
```

**原因**: 存储空间不足

**解决方案**:
1. 清理旧数据:
   ```javascript
   const { clearOldHistory } = await import('/lib/storage/indexeddb.js');
   await clearOldHistory(30); // 清理30天前的
   ```

2. 检查存储使用情况:
   ```javascript
   const { getStorageStats } = await import('/lib/storage/indexeddb.js');
   const stats = await getStorageStats();
   console.log('存储统计:', stats);
   ```

### 错误 5: 日志完整但 IndexedDB 仍为空

**检查数据库**:

1. F12 → Application → Storage → IndexedDB
2. 展开 `aigc-studio-local`
3. 查看 `images` 和 `history` 表

**手动验证**:
```javascript
// 打开数据库
const request = indexedDB.open('aigc-studio-local', 1);
request.onsuccess = () => {
  const db = request.result;
  
  // 查询 history 表
  const tx = db.transaction(['history'], 'readonly');
  const store = tx.objectStore('history');
  const getAllRequest = store.getAll();
  
  getAllRequest.onsuccess = () => {
    console.log('历史记录:', getAllRequest.result);
  };
  
  // 查询 images 表
  const tx2 = db.transaction(['images'], 'readonly');
  const store2 = tx2.objectStore('images');
  const getAllRequest2 = store2.getAll();
  
  getAllRequest2.onsuccess = () => {
    console.log('图片数据:', getAllRequest2.result);
  };
};
```

---

## ✅ 成功的标志

### 1. Console 日志完整

所有 13 步日志都出现,没有错误。

### 2. IndexedDB 有数据

**Application → IndexedDB → aigc-studio-local:**

```
├─ images (1 条记录)
│  └─ img-1234567890-abcde
│     ├─ blob: Blob (123456 bytes)
│     ├─ mimeType: "image/png"
│     ├─ size: 123456
│     ├─ createdAt: 1736877600000
│     └─ thumbnail: Blob (5678 bytes)
│
└─ history (1 条记录)
   └─ hist-1234567890-fghij
      ├─ id: "hist-1234567890-fghij"
      ├─ imageId: "img-1234567890-abcde"
      ├─ prompt: "一只可爱的橙色小猫"
      ├─ model: "your-model-slug"
      ├─ modelName: "Your Model Name"
      ├─ mode: "txt2img"
      ├─ size: "1024x1024"
      ├─ timestamp: 1736877600000
      ├─ shared: false
      └─ favorite: false
```

### 3. 历史面板有内容

点击"历史记录"按钮,应该看到刚生成的图片。

### 4. 刷新后仍然存在

1. 刷新页面 (F5)
2. 打开历史面板
3. ✅ 图片仍然存在
4. ✅ IndexedDB 数据仍然存在

---

## 🔧 高级调试

### 启用详细日志

如果需要更详细的日志,可以临时添加:

```typescript
// lib/storage/indexeddb.ts: saveImage 方法
async saveImage(blob: Blob, thumbnail?: Blob): Promise<string> {
  console.log('[IndexedDB] saveImage 被调用, blob size:', blob.size);
  const db = await this.ensureDB();
  console.log('[IndexedDB] 数据库已就绪');
  
  const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log('[IndexedDB] 生成 imageId:', id);
  
  // ... 省略 ...
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.images], 'readwrite');
    console.log('[IndexedDB] 事务已创建');
    
    const store = transaction.objectStore(STORES.images);
    const request = store.add(imageData);
    
    request.onsuccess = () => {
      console.log('[IndexedDB] 图片写入成功!');
      resolve(id);
    };
    
    request.onerror = (e) => {
      console.error('[IndexedDB] 图片写入失败:', e);
      reject(new Error('保存图片失败'));
    };
  });
}
```

### 监控 IndexedDB 事件

```javascript
// 在 Console 中运行
const originalOpen = indexedDB.open;
indexedDB.open = function(...args) {
  console.log('[IndexedDB Monitor] open 被调用:', args);
  const request = originalOpen.apply(this, args);
  
  request.onsuccess = (e) => {
    console.log('[IndexedDB Monitor] 数据库打开成功');
  };
  
  request.onerror = (e) => {
    console.error('[IndexedDB Monitor] 数据库打开失败:', e);
  };
  
  return request;
};
```

---

## 📊 性能监控

### 测量保存时间

```javascript
// 在 useLocalHistory.ts 的 addHistory 开始处
const startTime = performance.now();

// 在返回前
const endTime = performance.now();
console.log(`[Performance] 保存历史记录耗时: ${(endTime - startTime).toFixed(2)}ms`);
```

**预期时间**:
- 小图片 (<100KB): 50-200ms
- 中等图片 (100KB-1MB): 200-500ms
- 大图片 (1MB-5MB): 500-2000ms

---

## 🎯 问题总结与报告

测试完成后,请提供以下信息:

### 1. 浏览器信息
- 浏览器: Chrome / Safari / Firefox
- 版本: 
- 操作系统: macOS / Windows / Linux

### 2. IndexedDB 支持
```javascript
console.log('IndexedDB 支持:', !!window.indexedDB);
```

### 3. Console 日志截图
- 生成图片时的完整日志
- 有错误的地方用红框标注

### 4. IndexedDB 状态截图
- Application → IndexedDB → aigc-studio-local
- 显示 images 和 history 表的内容

### 5. 复现步骤
1. 具体操作步骤
2. 预期结果
3. 实际结果

---

**下一步**: 根据日志输出,我们可以精确定位问题发生在哪一步! 🎯
