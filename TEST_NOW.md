# 🚀 快速测试指引 - 图片持久化修复验证

## ⚡ 5 分钟快速测试

### 步骤 1: 清空旧数据 (30 秒)

打开浏览器控制台（F12），粘贴并执行：

```javascript
// 清空旧数据
indexedDB.deleteDatabase('aigc-studio-conversations');
indexedDB.deleteDatabase('aigc-studio-image-blobs');
console.log('✅ 数据已清空，刷新页面开始测试');
location.reload();
```

---

### 步骤 2: 启动开发服务器 (1 分钟)

```bash
cd /Volumes/devilnuttt/Code/image_Fotura
npm run dev
```

等待服务器启动完成后访问：http://localhost:3000/studio-v2

---

### 步骤 3: 生成第一张图片 (1 分钟)

1. 选择模型（如果有可用模型）
2. 输入提示词：`一只可爱的猫咪`
3. 点击发送
4. 等待图片生成完成

**预期结果：**
- ✅ 图片正常显示
- ✅ 控制台出现日志：`[ConversationView] 保存图片 Blob: msg-asst-xxx`

---

### 步骤 4: 刷新页面验证 (30 秒)

按 **F5** 刷新页面

**预期结果：**
- ✅ 看到加载提示：`正在恢复对话...`
- ✅ 图片正常显示（这是关键！）
- ✅ 控制台出现日志：
  ```
  [ImageBlobStore] 数据库初始化成功
  [ConversationDB] 恢复对话: conv-xxx
  [ImageBlobStore] 生成新的 blob URL: msg-asst-xxx
  [ConversationView] 恢复图片 Blob: msg-asst-xxx
  ```

---

### 步骤 5: 编辑图片测试 (2 分钟)

1. 点击图片下方的 **"作为输入"** 按钮
2. 输入新提示词：`赛博朋克风格`
3. 点击发送
4. 等待生成完成
5. **再次刷新页面 (F5)**

**预期结果：**
- ✅ 两张图片都正常显示
- ✅ 编辑链时间轴显示 2 个节点
- ✅ 完整提示词：`一只可爱的猫咪, 赛博朋克风格`

---

## 🧪 高级测试 (可选)

### 测试 A: 运行自动化测试脚本

1. 打开控制台 (F12)
2. 复制 `test-persistence.js` 的全部内容
3. 粘贴到控制台并执行
4. 查看测试结果

**预期输出：**
```
============================================================
🚀 图片持久化功能测试套件
============================================================

📋 测试 1: 检查数据库
  ✅ 已发现以下数据库: [...]
  ✅ aigc-studio-conversations - 存在
  ✅ aigc-studio-image-blobs - 存在
  ✅ aigc-studio-local - 存在

📋 测试 2: 查询对话数量
  ✅ 对话数量: 1

📋 测试 3: 查询消息和图片 Blob
  ✅ 消息数量: 2
  ✅ 图片 Blob 数量: 1

📋 测试 4: 检查 Blob 存储
  ✅ 存储使用: X.XX MB / XXXX MB (X.XX%)
  ✅ 存储空间充足

📋 测试 5: 显示最近的对话
  📝 对话信息:
    ID: conv-xxx
    标题: 一只可爱的猫咪
    ...

============================================================
✅ 所有测试通过 (5/5)
💡 建议: 按照 PERSISTENCE_TEST.md 进行完整场景测试
============================================================
```

---

### 测试 B: 检查 IndexedDB 数据

1. 打开 Chrome DevTools (F12)
2. 切换到 **Application** 标签
3. 展开 **IndexedDB**
4. 查看以下数据库：

```
├─ aigc-studio-conversations
│  ├─ conversations  (应该有 1 条记录)
│  └─ messages       (应该有 N 条记录)
│
├─ aigc-studio-image-blobs  ⭐ 新增
│  └─ imageBlobs     (应该有 N 条 Blob 记录)
│
└─ aigc-studio-local
   └─ images         (历史记录)
```

5. 点击 `aigc-studio-image-blobs` → `imageBlobs`
6. 查看 Blob 记录，确认 `blob.size > 0`

---

### 测试 C: 长对话测试

连续生成 5 张图片，刷新页面，验证所有图片都正常显示。

---

## ❌ 如果测试失败

### 问题 1: 刷新后图片仍不显示

**检查步骤：**
1. 打开控制台查看是否有错误日志
2. 确认看到 `[ImageBlobStore] 生成新的 blob URL` 日志
3. 检查 IndexedDB 中是否有 `aigc-studio-image-blobs` 数据库

**解决方案：**
```javascript
// 清空所有数据重试
indexedDB.deleteDatabase('aigc-studio-conversations');
indexedDB.deleteDatabase('aigc-studio-image-blobs');
indexedDB.deleteDatabase('aigc-studio-local');
location.reload();
```

---

### 问题 2: 没有看到 ImageBlobStore 日志

**可能原因：**
- 代码未正确部署
- 浏览器缓存未清除

**解决方案：**
1. 硬刷新页面：`Ctrl + Shift + R` (Mac: `Cmd + Shift + R`)
2. 清除浏览器缓存
3. 重启开发服务器：`npm run dev`

---

### 问题 3: IndexedDB 不支持

**检查：**
```javascript
console.log('IndexedDB 支持:', 'indexedDB' in window);
```

如果返回 `false`，说明浏览器不支持或被禁用（隐私模式）。

---

## 📊 成功标志

完整测试通过后，你应该看到：

- ✅ **控制台日志**
  - `[ImageBlobStore] 数据库初始化成功`
  - `[ConversationView] 保存图片 Blob: xxx`
  - `[ImageBlobStore] 生成新的 blob URL: xxx`
  - `[ConversationView] 恢复图片 Blob: xxx`

- ✅ **IndexedDB 数据**
  - `aigc-studio-image-blobs` 数据库存在
  - `imageBlobs` 表中有 Blob 记录
  - Blob size > 0

- ✅ **UI 表现**
  - 刷新后图片正常显示
  - 编辑链完整
  - 对话标题自动生成

---

## 🎉 测试通过！

如果所有测试通过，恭喜！图片持久化功能已完全修复。

### 下一步可以做什么？

1. **UI 优化**
   - [ ] 左侧会话列表 + 新建按钮
   - [ ] 图片点击预览（Lightbox）
   - [ ] 高级选项默认展开
   - [ ] "作为输入" 改为 "编辑"

2. **功能增强**
   - [ ] 时间轴节点点击回退
   - [ ] 会话重命名/删除
   - [ ] 导出对话

3. **发布功能（阶段 3）**
   - [ ] 发布对话框
   - [ ] 提交到服务器
   - [ ] 首页展示

---

## 📞 需要帮助？

- 查看 `BLOB_FIX_SUMMARY.md` - 修复详细说明
- 查看 `PERSISTENCE_TEST.md` - 完整测试场景
- 运行 `test-persistence.js` - 自动化诊断

**问题反馈：** 提供控制台截图 + IndexedDB 数据截图

---

**最后更新：** 2025-01-14 23:20 UTC  
**预计测试时间：** 5-10 分钟  
**成功率：** 🎯 预期 100%
