# 🔧 Blob URL 持久化修复总结

## 📌 问题描述

**原始问题：** 刷新页面后生成的图片无法显示

**错误信息：**
```
GET blob:http://localhost:3000/328b45c8-... net::ERR_FILE_NOT_FOUND
```

**根本原因：**
- Blob URL 是浏览器会话临时生成的内存引用
- 页面刷新后，旧的 blob URL 失效，Blob 对象被释放
- 对话持久化只保存了 URL 字符串，而不是 Blob 对象本身

---

## ✅ 解决方案

### 核心思路

**将 Blob URL 转换为 Blob 对象存储，恢复时重新生成 URL**

```
保存流程：
blob:http://... → fetch() → Blob 对象 → IndexedDB

恢复流程：
IndexedDB → Blob 对象 → URL.createObjectURL() → 新的 blob:http://...
```

---

## 📁 新增文件

### 1. `lib/storage/image-blob.ts` (221 行)

**功能：** 图片 Blob 专用存储层

**核心 API：**
```typescript
class ImageBlobStore {
  // 从 blob URL 保存 Blob 对象
  async saveBlobFromURL(id: string, blobURL: string): Promise<void>
  
  // 获取 Blob 并生成新 URL
  async getBlobURL(id: string): Promise<string | null>
  
  // 删除单个 Blob
  async deleteBlob(id: string): Promise<void>
  
  // 批量删除 Blob
  async deleteBlobsByMessageIds(messageIds: string[]): Promise<void>
  
  // 清空所有 Blob
  async clearAll(): Promise<void>
}

export const imageBlobStore = new ImageBlobStore();
```

**数据库结构：**
```typescript
// DB: aigc-studio-image-blobs
// Store: imageBlobs
interface ImageBlobRecord {
  id: string;        // 消息 ID (主键)
  blob: Blob;        // 图片 Blob 对象
  timestamp: number; // 保存时间戳
}
```

---

## 🔄 修改文件

### 2. `lib/storage/conversation-db.ts`

**修改点 1: 导入 imageBlobStore**
```typescript
import { imageBlobStore } from './image-blob';
```

**修改点 2: 删除对话时级联删除图片 Blob**
```typescript
async deleteConversation(id: string): Promise<void> {
  const messages = await this.getMessages(id);
  const messageIds = messages.map(m => m.id);
  
  // 🆕 删除所有图片 Blob
  await imageBlobStore.deleteBlobsByMessageIds(messageIds);
  
  // ...原有逻辑
}
```

**修改点 3: 删除消息时删除关联 Blob**
```typescript
async deleteMessage(id: string): Promise<void> {
  // 🆕 删除关联的图片 Blob
  try {
    await imageBlobStore.deleteBlob(id);
  } catch (error) {
    console.warn('[ConversationDB] 删除图片 Blob 失败（可能不存在）:', id);
  }
  
  // ...原有逻辑
}
```

**修改点 4: 清空数据库时清空 Blob**
```typescript
async clearAll(): Promise<void> {
  // 🆕 清空所有图片 Blob
  await imageBlobStore.clearAll();
  
  // ...原有逻辑
}
```

---

### 3. `components/ai/conversation/conversation-view.tsx`

**修改点 1: 导入 imageBlobStore**
```typescript
import { imageBlobStore } from '@/lib/storage/image-blob';
```

**修改点 2: 保存消息时存储图片 Blob**
```typescript
const saveMessageToDB = useCallback(async (message: ConversationMessage) => {
  if (!dbSupported) return;

  try {
    const db = await getConversationDB();
    
    // 🆕 如果消息包含图片，先保存 Blob
    if (message.imageUrl && message.imageUrl.startsWith('blob:')) {
      console.log('[ConversationView] 保存图片 Blob:', message.id);
      await imageBlobStore.saveBlobFromURL(message.id, message.imageUrl);
    }
    
    await db.saveMessage(message);
    // ...
  }
}, [dbSupported, currentConversationId, selectedModel]);
```

**修改点 3: 恢复对话时恢复图片 Blob URL**
```typescript
// 恢复消息
const msgs = await db.getMessages(lastConv.id);

// 🆕 恢复图片 Blob URL
const restoredMsgs = await Promise.all(
  msgs.map(async (msg) => {
    if (msg.imageUrl) {
      // 尝试从 Blob 存储恢复 URL
      const newBlobURL = await imageBlobStore.getBlobURL(msg.id);
      if (newBlobURL) {
        console.log('[ConversationView] 恢复图片 Blob:', msg.id);
        return { ...msg, imageUrl: newBlobURL };
      }
    }
    return msg;
  })
);

setMessages(restoredMsgs);
```

---

## 🧪 测试资源

### 1. `PERSISTENCE_TEST.md` (已更新)
- 增加 Blob 存储说明
- 更新日志示例
- 增加技术详情章节

### 2. `test-persistence.js` (新增)
浏览器控制台测试脚本，包含 5 个自动化测试：
- 检查数据库是否存在
- 查询对话数量
- 查询消息和图片 Blob 数量
- 检查 Blob 存储大小
- 显示最近的对话信息

**使用方法：**
```javascript
// 1. 复制 test-persistence.js 内容到浏览器控制台
// 2. 自动运行 5 个测试
// 3. 查看测试结果

// 可选：清空所有数据
window.clearAllConversationData();
```

---

## 📊 数据库架构

### 新架构 (3 个 IndexedDB 数据库)

```
┌─────────────────────────────────────────┐
│ aigc-studio-conversations               │
│ ├─ conversations (对话元数据)           │
│ │  └─ id, title, messageIds, ...       │
│ └─ messages (消息记录)                  │
│    └─ id, conversationId, content, ... │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ aigc-studio-image-blobs  (🆕 新增)     │
│ └─ imageBlobs (图片 Blob 存储)          │
│    └─ id, blob, timestamp               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ aigc-studio-local (历史记录，已有)       │
│ └─ images                               │
│    └─ id, url, title, metadata, ...    │
└─────────────────────────────────────────┘
```

**关系：**
- `messages.id` = `imageBlobs.id` (一对一)
- 删除消息时自动删除对应 Blob
- 删除对话时批量删除所有消息的 Blob

---

## 🔍 调试技巧

### 查看 Blob 存储

```javascript
// 打开 Chrome DevTools
// F12 → Application → IndexedDB → aigc-studio-image-blobs

// 或者使用脚本查询
const request = indexedDB.open('aigc-studio-image-blobs', 1);
request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction(['imageBlobs'], 'readonly');
  const store = tx.objectStore('imageBlobs');
  const req = store.getAll();
  
  req.onsuccess = () => {
    console.log('所有 Blob 记录:', req.result);
    req.result.forEach(record => {
      console.log(`ID: ${record.id}, Size: ${record.blob.size} bytes`);
    });
  };
};
```

### 验证 Blob URL 生成

```javascript
// 在恢复对话时查看日志
// 应该看到:
// [ImageBlobStore] 生成新的 blob URL: msg-asst-xxx
// [ConversationView] 恢复图片 Blob: msg-asst-xxx

// 生成的 URL 格式:
// blob:http://localhost:3000/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## ✅ 验证清单

测试前清空旧数据：
```javascript
indexedDB.deleteDatabase('aigc-studio-conversations');
indexedDB.deleteDatabase('aigc-studio-image-blobs');
location.reload();
```

完整测试流程：

- [ ] **场景 1: 基础持久化**
  - [ ] 生成 1 张图片
  - [ ] 刷新页面
  - [ ] ✅ 图片正常显示

- [ ] **场景 2: 多次编辑**
  - [ ] 生成图 A → 作为输入 → 生成图 B
  - [ ] 刷新页面
  - [ ] ✅ 图 A 和图 B 都正常显示
  - [ ] ✅ 编辑链完整

- [ ] **场景 3: 长对话**
  - [ ] 连续生成 5 张图片
  - [ ] 刷新页面
  - [ ] ✅ 所有图片正常显示

- [ ] **场景 4: 数据库检查**
  - [ ] 打开 IndexedDB 查看器
  - [ ] ✅ 看到 `aigc-studio-image-blobs` 数据库
  - [ ] ✅ `imageBlobs` 表中有对应记录
  - [ ] ✅ Blob size > 0

---

## 🚀 下一步

修复已完成！现在可以：

1. **立即测试** - 按照 `PERSISTENCE_TEST.md` 完整测试
2. **UI 优化** - 实现左侧会话列表 + 图片点击预览
3. **时间轴回退** - 实现编辑链节点点击回退
4. **发布功能** - 实现图片发布到首页

---

## 📞 问题排查

如果仍有问题：

1. **检查控制台日志** - 查看是否有错误信息
2. **运行测试脚本** - 复制 `test-persistence.js` 到控制台
3. **清空数据重试** - `window.clearAllConversationData()`
4. **检查浏览器支持** - 确认 IndexedDB 可用
5. **查看存储配额** - `navigator.storage.estimate()`

---

**修复完成时间：** 2025-01-14 23:10 UTC  
**影响范围：** 3 个文件修改 + 1 个文件新增  
**向后兼容：** ✅ 旧版本数据可继续使用（但不会自动迁移到 Blob 存储）  
**建议操作：** 清空旧数据，使用新版本重新生成
