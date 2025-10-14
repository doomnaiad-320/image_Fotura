# 🧪 对话持久化功能 - 测试指南

## ✅ 已实现功能

对话持久化功能现已完全集成！以下是测试步骤。

---

## 🎯 测试场景

### 场景 1: 基础持久化测试

**步骤：**
1. 访问 `http://localhost:3000/studio-v2`
2. 选择一个模型
3. 输入提示词："一只猫"
4. 点击发送，等待生成完成
5. **刷新页面 (F5)**

**预期结果：**
- ✅ 刷新后自动显示"正在恢复对话..."加载状态
- ✅ 对话内容完整恢复（用户消息+助手消息+图片）
- ✅ 模型选择自动恢复到之前的模型
- ✅ 滚动位置自动到底部

**验证方式：**
```javascript
// 打开浏览器控制台，查看日志
// 应该看到:
// [ConversationDB] 数据库初始化成功
// [ConversationDB] 加载 N 个对话
// [ConversationView] 恢复对话: conv-xxx
// [ConversationDB] 加载 N 条消息
// [ConversationView] 已恢复 N 条消息
```

---

### 场景 2: 多次编辑持久化测试

**步骤：**
1. 生成一张图片："一只猫"
2. 点击"作为输入"
3. 输入："赛博朋克风格"
4. 生成完成后，**刷新页面**
5. 再次点击"作为输入"
6. 输入："背景改为东京"
7. 生成完成后，**再次刷新**

**预期结果：**
- ✅ 每次刷新都能恢复完整的编辑链
- ✅ 编辑链时间轴正确显示所有节点
- ✅ 完整提示词累积正确："一只猫, 赛博朋克风格, 背景改为东京"

---

### 场景 3: 对话标题自动生成测试

**步骤：**
1. 清空浏览器数据（或打开隐身窗口）
2. 访问工作台
3. 第一次发送消息："一只赛博朋克风格的猫坐在东京街头的霓虹灯下"
4. 打开浏览器 IndexedDB 查看器

**预期结果：**
- ✅ 对话标题自动设置为前30个字符
- ✅ 在 IndexedDB 中可以看到对话记录

**查看 IndexedDB：**
```
Chrome: F12 → Application → IndexedDB → aigc-studio-conversations
Firefox: F12 → Storage → Indexed DB → aigc-studio-conversations
Safari: Develop → Web Inspector → Storage → Indexed DB
```

---

### 场景 4: 长时间使用测试

**步骤：**
1. 在同一个对话中生成 5 张图片
2. 中途刷新页面 2-3 次
3. 继续生成，再刷新

**预期结果：**
- ✅ 所有消息完整保留
- ✅ 图片链接正常（blob URL 正常工作）
- ✅ 对话标题保持不变
- ✅ 消息顺序正确

---

## 🔍 调试技巧

### 查看控制台日志

```javascript
// 过滤对话相关日志
// 在控制台输入:
localStorage.setItem('debug', 'ConversationDB,ConversationView')
```

### 手动查询 IndexedDB

```javascript
// 在控制台执行
(async () => {
  const db = await indexedDB.databases();
  console.log('数据库列表:', db);
  
  // 查看对话数
  const request = indexedDB.open('aigc-studio-conversations', 1);
  request.onsuccess = (e) => {
    const db = e.target.result;
    const tx = db.transaction(['conversations'], 'readonly');
    const store = tx.objectStore('conversations');
    const countReq = store.count();
    countReq.onsuccess = () => {
      console.log('对话数量:', countReq.result);
    };
  };
})();
```

### 清空对话数据

```javascript
// 在控制台执行
indexedDB.deleteDatabase('aigc-studio-conversations');
location.reload();
```

---

## 🐛 已知问题与解决方案

### 问题 1: 刷新后图片不显示

**原因:** blob URL 已释放

**解决方案:** 
- 当前版本图片存储在 `aigc-studio-local` (历史记录数据库)
- 对话恢复时自动从历史记录读取 blob URL
- 如果仍有问题，清空两个数据库重新开始

### 问题 2: 对话未自动恢复

**原因:** IndexedDB 初始化失败

**检查步骤:**
1. 确认浏览器支持 IndexedDB
2. 检查是否在隐私/无痕模式（部分浏览器限制 IndexedDB）
3. 查看控制台是否有错误日志

**解决方案:**
```javascript
// 检查 IndexedDB 支持
console.log('IndexedDB 支持:', 'indexedDB' in window);

// 检查存储配额
navigator.storage.estimate().then(estimate => {
  console.log('存储使用:', estimate.usage, '/', estimate.quota);
});
```

### 问题 3: 对话标题显示为"新对话"

**原因:** 对话创建后用户未发送消息

**解决方案:**
- 发送第一条消息后标题会自动更新
- 这是正常行为，不影响功能

---

## 📊 性能测试

### 存储容量测试

```javascript
// 测试存储容量
(async () => {
  const db = await indexedDB.open('aigc-studio-conversations', 1);
  
  // 创建 100 条测试消息
  for (let i = 0; i < 100; i++) {
    const msg = {
      id: `test-${i}`,
      conversationId: 'test-conv',
      role: 'user',
      content: `测试消息 ${i}`,
      timestamp: Date.now() + i
    };
    // 保存逻辑...
  }
  
  console.log('100 条消息已创建');
})();
```

### 恢复速度测试

```javascript
// 测试恢复时间
console.time('对话恢复');
// 刷新页面
// 看到"已恢复 N 条消息"日志后
console.timeEnd('对话恢复');

// 预期: < 500ms (对于普通对话)
```

---

## ✅ 功能验证清单

在提交 PR 或部署前，确保以下测试通过：

- [ ] 初次访问自动创建新对话
- [ ] 发送消息后刷新能恢复
- [ ] 编辑链刷新后完整恢复
- [ ] 对话标题自动生成
- [ ] 模型选择自动恢复
- [ ] 图片正常显示（blob URL 有效）
- [ ] 控制台无报错
- [ ] IndexedDB 数据结构正确
- [ ] 多次刷新后数据不丢失
- [ ] 长对话（10+消息）恢复正常

---

## 🚀 下一步测试

### 待实现功能测试

1. **会话列表** (UI优化2)
   - 创建多个对话
   - 切换对话
   - 重命名对话
   - 删除对话

2. **时间轴节点回退**
   - 点击编辑链节点
   - 回到指定状态
   - 从该状态继续编辑

3. **发布功能** (阶段3)
   - 点击发布按钮
   - 填写发布表单
   - 提交到服务器
   - 查看首页更新

---

## 📞 报告问题

如果发现任何问题，请提供以下信息：

1. **浏览器和版本**
2. **控制台日志截图**
3. **IndexedDB 数据截图**
4. **复现步骤**
5. **预期行为 vs 实际行为**

---

**测试完成标志:** 所有场景测试通过 + 验证清单全部勾选 ✅

**最后更新:** 2025-01-14 22:26 UTC
