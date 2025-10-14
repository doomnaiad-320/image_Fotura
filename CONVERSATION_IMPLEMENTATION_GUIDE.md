# 对话式 AI 工作台 - 实施指南

## 📖 概述

本文档详细说明如何将现有的左右分栏工作台改造为**对话式界面**，核心特性包括：

1. ✅ **对话式交互** - 类似 ChatGPT 的消息流
2. ✅ **手动模型选择** - 顶部下拉菜单，无 AI 推荐
3. ✅ **编辑链可视化** - 每次编辑基于上一版本，显示时间轴
4. ✅ **单条消息发布** - 每条生成结果可独立发布到首页
5. ✅ **完整 Prompt 累积** - 发布时使用累积的完整提示词

---

## 🎯 核心概念

### 1. 编辑链 (EditChain)

每次点击"作为输入"时，创建一条新的编辑链节点：

```
原图 (文生图)
  ↓ 用户点击"作为输入"
编辑1 (图生图: "把背景改为东京")
  ↓ 用户再次点击"作为输入"
编辑2 (图生图: "增强霓虹灯效果")
```

**完整 Prompt**: `"一只赛博朋克风格的猫, 把背景改为东京, 增强霓虹灯效果"`

### 2. 消息结构

```typescript
ConversationMessage {
  id: "msg-123",
  role: "assistant",
  content: "增强霓虹灯效果", // 用户的编辑提示
  imageUrl: "blob://...",
  editChain: {
    basePrompt: "一只赛博朋克风格的猫",
    edits: [
      { prompt: "把背景改为东京", messageId: "msg-100" },
      { prompt: "增强霓虹灯效果", messageId: "msg-123" }
    ],
    fullPrompt: "一只赛博朋克风格的猫, 把背景改为东京, 增强霓虹灯效果",
    parentMessageId: "msg-100"
  }
}
```

---

## 🛠️ 实施步骤

### 阶段 1: UI 重构 (1-2 天)

#### 1.1 创建组件目录

```bash
mkdir -p components/ai/conversation
```

创建以下组件：

```
components/ai/conversation/
├── conversation-view.tsx          # 主容器
├── conversation-header.tsx        # 顶部工具栏(模型选择)
├── message-list.tsx               # 消息列表
├── message-item.tsx               # 单条消息
├── image-result-card.tsx          # 图片结果卡片
├── message-actions.tsx            # 操作按钮(作为输入/下载/发布)
├── edit-chain-timeline.tsx        # 编辑链时间轴
├── input-area.tsx                 # 输入框+高级选项
└── publish-dialog.tsx             # 发布对话框
```

#### 1.2 主容器布局

`components/ai/conversation/conversation-view.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import ConversationHeader from './conversation-header';
import MessageList from './message-list';
import InputArea from './input-area';
import type { ConversationMessage } from '@/types/conversation';

export function ConversationView() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      {/* 顶部工具栏 */}
      <ConversationHeader
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      {/* 消息列表 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        <MessageList
          messages={messages}
          onUseAsInput={(messageId) => {
            // 处理"作为输入"逻辑
          }}
          onPublish={(messageId) => {
            // 处理发布逻辑
          }}
        />
      </div>

      {/* 输入框 */}
      <InputArea
        selectedModel={selectedModel}
        onSend={(prompt) => {
          // 处理发送逻辑
        }}
      />
    </div>
  );
}
```

#### 1.3 消息卡片组件

`components/ai/conversation/message-item.tsx`:

```tsx
'use client';

import Image from 'next/image';
import MessageActions from './message-actions';
import EditChainTimeline from './edit-chain-timeline';
import type { ConversationMessage } from '@/types/conversation';

interface Props {
  message: ConversationMessage;
  onUseAsInput: () => void;
  onPublish: () => void;
}

export function MessageItem({ message, onUseAsInput, onPublish }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* 头像 */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white flex-shrink-0">
          🤖
        </div>
      )}

      {/* 消息内容 */}
      <div className={`max-w-[70%] ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-800'} rounded-2xl p-4`}>
        {/* 文本内容 */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* 图片结果 */}
        {message.imageUrl && (
          <div className="mt-3 space-y-3">
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={message.imageUrl}
                alt="Generated"
                className="w-full"
              />
            </div>

            {/* 编辑链时间轴 */}
            {message.editChain && (
              <EditChainTimeline editChain={message.editChain} />
            )}

            {/* 操作按钮 */}
            <MessageActions
              onUseAsInput={onUseAsInput}
              onDownload={() => {
                const link = document.createElement('a');
                link.href = message.imageUrl!;
                link.download = `image-${Date.now()}.png`;
                link.click();
              }}
              onPublish={onPublish}
              published={message.published}
            />
          </div>
        )}

        {/* 生成中状态 */}
        {message.isGenerating && (
          <div className="mt-3 flex items-center gap-2 text-gray-400">
            <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
            <span className="text-sm">正在生成...</span>
          </div>
        )}
      </div>

      {/* 用户头像 */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
          👤
        </div>
      )}
    </div>
  );
}

export default MessageItem;
```

---

### 阶段 2: 核心逻辑 (2-3 天)

#### 2.1 IndexedDB 对话存储

扩展 `lib/storage/indexeddb.ts`:

```typescript
// 添加新的对象存储
export interface ConversationStore {
  id: string;
  title: string;
  messageIds: string[];
  createdAt: number;
  updatedAt: number;
  lastActiveModel?: string;
}

export interface MessageStore {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  imageId?: string;
  editChain?: EditChain;
  timestamp: number;
  published?: boolean;
}

// 在 openDB 时升级数据库版本
const DB_VERSION = 2;

// 新增操作方法
export async function saveConversation(conversation: ConversationStore): Promise<void> {
  const db = await getDB();
  await db.add('conversations', conversation);
}

export async function saveMessage(message: MessageStore): Promise<void> {
  const db = await getDB();
  await db.add('messages', message);
}

export async function loadConversation(id: string): Promise<{
  conversation: ConversationStore;
  messages: MessageStore[];
}> {
  const db = await getDB();
  const conversation = await db.get('conversations', id);
  
  if (!conversation) {
    throw new Error('会话不存在');
  }
  
  const messages = await Promise.all(
    conversation.messageIds.map(id => db.get('messages', id))
  );
  
  return { conversation, messages: messages.filter(Boolean) };
}
```

#### 2.2 生成逻辑集成

修改 `components/ai/conversation/conversation-view.tsx`:

```typescript
const handleSend = async (prompt: string, parentMessageId?: string) => {
  if (!selectedModel) {
    toast.error('请先选择模型');
    return;
  }

  // 1. 添加用户消息
  const userMsg: ConversationMessage = {
    id: `msg-user-${Date.now()}`,
    conversationId: currentConversationId,
    role: 'user',
    content: prompt,
    timestamp: Date.now()
  };
  setMessages(prev => [...prev, userMsg]);

  // 2. 添加助手消息(生成中状态)
  const assistantMsg: ConversationMessage = {
    id: `msg-asst-${Date.now()}`,
    conversationId: currentConversationId,
    role: 'assistant',
    content: prompt,
    timestamp: Date.now(),
    isGenerating: true
  };
  setMessages(prev => [...prev, assistantMsg]);

  try {
    // 3. 调用生成 API
    let imageUrl: string;
    let editChain: EditChain | undefined;

    if (parentMessageId) {
      // 图生图模式
      const parentMsg = messages.find(m => m.id === parentMessageId);
      if (!parentMsg || !parentMsg.imageUrl) {
        throw new Error('父消息无效');
      }

      // 创建编辑链
      editChain = createEditChain(parentMsg, prompt, assistantMsg.id);

      // 调用 /api/ai/images/edits
      const formData = new FormData();
      formData.append('model', selectedModel);
      formData.append('prompt', editChain.fullPrompt); // 使用完整 prompt!
      formData.append('size', selectedSize);
      formData.append('n', '1');

      // 获取父图片
      const parentBlob = await fetch(parentMsg.imageUrl).then(r => r.blob());
      formData.append('image', parentBlob);

      const response = await httpFetch('/api/ai/images/edits', {
        method: 'POST',
        body: formData
      });

      imageUrl = response.data[0].url;
    } else {
      // 文生图模式
      const response = await httpFetch('/api/ai/images/generations', {
        method: 'POST',
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt,
          size: selectedSize,
          n: 1
        })
      });

      imageUrl = response.data[0].url;
    }

    // 4. 保存到 IndexedDB
    const { localUrl, historyId } = await addLocalHistory(
      imageUrl,
      prompt,
      {
        model: selectedModel,
        mode: parentMessageId ? 'img2img' : 'txt2img',
        size: selectedSize
      }
    );

    // 5. 更新助手消息
    setMessages(prev => prev.map(m =>
      m.id === assistantMsg.id
        ? {
            ...m,
            imageUrl: localUrl,
            imageId: historyId,
            editChain,
            isGenerating: false
          }
        : m
    ));

    // 6. 保存消息到 IndexedDB
    await saveMessage({
      id: assistantMsg.id,
      conversationId: currentConversationId,
      role: 'assistant',
      content: prompt,
      imageId: historyId,
      editChain,
      timestamp: assistantMsg.timestamp
    });

    toast.success('生成成功！');
  } catch (error) {
    // 错误处理
    setMessages(prev => prev.map(m =>
      m.id === assistantMsg.id
        ? {
            ...m,
            isGenerating: false,
            error: error instanceof Error ? error.message : '生成失败'
          }
        : m
    ));
    toast.error('生成失败');
  }
};
```

---

### 阶段 3: 发布功能 (1-2 天)

#### 3.1 发布 API

创建 `app/api/assets/publish/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDB } from '@/lib/storage/indexeddb';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await req.json();
  const {
    messageId,
    conversationId,
    imageUrl,
    fullPrompt,
    editChain,
    model,
    modelName,
    size,
    mode,
    tags = [],
    isPublic = true
  } = body;

  // 验证图片URL (必须是远程URL，不能是 blob://)
  if (imageUrl.startsWith('blob:')) {
    return NextResponse.json(
      { error: '本地图片无法发布，请先上传到云存储' },
      { status: 400 }
    );
  }

  // 创建 Asset 记录
  const asset = await prisma.asset.create({
    data: {
      title: fullPrompt.slice(0, 100),
      type: 'image',
      coverUrl: imageUrl,
      aspectRatio: calculateAspectRatio(size),
      modelTag: modelName || model,
      tags: JSON.stringify([mode, model, ...tags]),
      metadata: JSON.stringify({
        fullPrompt,
        editChain,
        model,
        size,
        mode,
        publishedFrom: 'conversation',
        messageId,
        conversationId
      })
    }
  });

  return NextResponse.json({
    success: true,
    assetId: asset.id
  });
}

function calculateAspectRatio(size: string): number {
  const [w, h] = size.split('x').map(Number);
  return w / h;
}
```

#### 3.2 发布对话框

`components/ai/conversation/publish-dialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  message: ConversationMessage;
}

export function PublishDialog({ isOpen, onClose, message }: Props) {
  const [fullPrompt, setFullPrompt] = useState(
    message.editChain?.fullPrompt || message.content
  );
  const [tags, setTags] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      const response = await fetch('/api/assets/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          conversationId: message.conversationId,
          imageUrl: message.imageUrl,
          fullPrompt,
          editChain: message.editChain,
          model: message.generationParams?.model,
          modelName: message.generationParams?.modelName,
          size: message.generationParams?.size,
          mode: message.generationParams?.mode,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '发布失败');
      }

      toast.success('已发布到首页！');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发布失败');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">📤 发布到首页</h2>

        <div>
          <img
            src={message.imageUrl}
            alt="Preview"
            className="w-full rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">完整提示词</label>
          <Textarea
            value={fullPrompt}
            onChange={(e) => setFullPrompt(e.target.value)}
            rows={4}
            placeholder="编辑完整的提示词..."
          />
          <p className="text-xs text-gray-500">
            这是自动累积的完整提示词，可以根据需要调整
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">标签 (用逗号分隔)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="例如: 赛博朋克, 猫, 霓虹灯"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isPublishing}>
            取消
          </Button>
          <Button onClick={handlePublish} loading={isPublishing}>
            确认发布
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

---

## 🎨 视觉设计建议

### 配色方案

```css
/* 对话气泡 */
.user-message {
  @apply bg-gradient-to-r from-blue-500 to-blue-600 text-white;
}

.assistant-message {
  @apply bg-gray-800 text-gray-100;
}

/* 编辑链时间轴 */
.timeline-node {
  @apply w-8 h-8 rounded-full bg-orange-500 border-4 border-gray-900;
}

.timeline-line {
  @apply h-0.5 bg-gradient-to-r from-orange-500 to-orange-300;
}

/* 操作按钮 */
.action-button {
  @apply px-4 py-2 rounded-lg transition-all duration-200;
  @apply bg-gray-700 hover:bg-gray-600 text-white;
}

.action-button-primary {
  @apply bg-gradient-to-r from-orange-500 to-orange-600;
  @apply hover:from-orange-600 hover:to-orange-700;
}
```

### 动画效果

```css
/* 消息出现动画 */
@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-enter {
  animation: message-in 0.3s ease-out;
}

/* 生成中脉冲动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.generating {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## 🧪 测试清单

### 功能测试

- [ ] 发送提示词 → 生成图片 → 显示正确
- [ ] 点击"作为输入" → 进入编辑模式 → 提示词继承
- [ ] 多次编辑 → 编辑链显示完整
- [ ] 发布图片 → fullPrompt 累积正确
- [ ] 刷新页面 → 对话历史恢复

### 边界测试

- [ ] 没有选择模型 → 提示用户
- [ ] 余额不足 → 正确拦截
- [ ] 网络错误 → 显示错误信息
- [ ] blob URL 发布 → 提示无法发布

---

## 📚 相关文档

- [WARP.md](./WARP.md) - 项目完整文档
- [DATABASE_SEEDING.md](./DATABASE_SEEDING.md) - 数据库种子系统
- [PROVIDER_GUIDE.md](./PROVIDER_GUIDE.md) - Provider 配置指南

---

## 🤝 贡献

遇到问题或有改进建议？请提交 Issue 或 Pull Request！
