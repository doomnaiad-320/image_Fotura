/**
 * 对话存储模块 - IndexedDB 扩展
 * 
 * 管理对话会话和消息的持久化存储
 */

import type { Conversation, ConversationMessage } from '@/types/conversation';

const DB_NAME = 'aigc-studio-conversations';
const DB_VERSION = 1;

export const CONVERSATION_STORES = {
  conversations: 'conversations',
  messages: 'messages'
} as const;

/**
 * 对话数据库类
 */
export class ConversationDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('浏览器不支持 IndexedDB'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('无法打开对话数据库'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ConversationDB] 数据库初始化成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建 conversations 表
        if (!db.objectStoreNames.contains(CONVERSATION_STORES.conversations)) {
          const conversationsStore = db.createObjectStore(
            CONVERSATION_STORES.conversations,
            { keyPath: 'id' }
          );
          conversationsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          conversationsStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('[ConversationDB] 创建 conversations 表');
        }

        // 创建 messages 表
        if (!db.objectStoreNames.contains(CONVERSATION_STORES.messages)) {
          const messagesStore = db.createObjectStore(
            CONVERSATION_STORES.messages,
            { keyPath: 'id' }
          );
          messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('role', 'role', { unique: false });
          console.log('[ConversationDB] 创建 messages 表');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('对话数据库初始化失败');
    }
    return this.db;
  }

  // ==================== 对话操作 ====================

  /**
   * 创建新对话
   */
  async createConversation(conversation: Conversation): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.conversations], 'readwrite');
      const store = transaction.objectStore(CONVERSATION_STORES.conversations);
      const request = store.add(conversation);

      request.onsuccess = () => {
        console.log('[ConversationDB] 对话创建成功:', conversation.id);
        resolve();
      };
      request.onerror = () => reject(new Error('创建对话失败'));
    });
  }

  /**
   * 获取对话列表
   */
  async listConversations(limit = 50): Promise<Conversation[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.conversations], 'readonly');
      const store = transaction.objectStore(CONVERSATION_STORES.conversations);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev'); // 按更新时间倒序

      const results: Conversation[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor && results.length < limit) {
          results.push(cursor.value as Conversation);
          cursor.continue();
        } else {
          console.log('[ConversationDB] 加载', results.length, '个对话');
          resolve(results);
        }
      };

      request.onerror = () => reject(new Error('读取对话列表失败'));
    });
  }

  /**
   * 获取单个对话
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.conversations], 'readonly');
      const store = transaction.objectStore(CONVERSATION_STORES.conversations);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as Conversation || null);
      };
      request.onerror = () => reject(new Error('读取对话失败'));
    });
  }

  /**
   * 更新对话
   */
  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const db = await this.ensureDB();
    const existing = await this.getConversation(id);

    if (!existing) {
      throw new Error('对话不存在');
    }

    const updated = { ...existing, ...updates, updatedAt: Date.now() };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.conversations], 'readwrite');
      const store = transaction.objectStore(CONVERSATION_STORES.conversations);
      const request = store.put(updated);

      request.onsuccess = () => {
        console.log('[ConversationDB] 对话更新成功:', id);
        resolve();
      };
      request.onerror = () => reject(new Error('更新对话失败'));
    });
  }

  /**
   * 删除对话（级联删除所有消息）
   */
  async deleteConversation(id: string): Promise<void> {
    const db = await this.ensureDB();

    // 先删除所有消息
    const messages = await this.getMessages(id);
    for (const message of messages) {
      await this.deleteMessage(message.id);
    }

    // 再删除对话
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.conversations], 'readwrite');
      const store = transaction.objectStore(CONVERSATION_STORES.conversations);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[ConversationDB] 对话删除成功:', id);
        resolve();
      };
      request.onerror = () => reject(new Error('删除对话失败'));
    });
  }

  // ==================== 消息操作 ====================

  /**
   * 保存消息
   */
  async saveMessage(message: ConversationMessage): Promise<void> {
    const db = await this.ensureDB();

    // 同时更新对话的 messageIds 和 updatedAt
    const conversation = await this.getConversation(message.conversationId);
    if (conversation) {
      const messageIds = conversation.messageIds || [];
      if (!messageIds.includes(message.id)) {
        messageIds.push(message.id);
        await this.updateConversation(message.conversationId, {
          messageIds,
          messageCount: messageIds.length,
          imageCount: (conversation.imageCount || 0) + (message.imageUrl ? 1 : 0)
        });
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.messages], 'readwrite');
      const store = transaction.objectStore(CONVERSATION_STORES.messages);
      const request = store.add(message);

      request.onsuccess = () => {
        console.log('[ConversationDB] 消息保存成功:', message.id);
        resolve();
      };
      request.onerror = () => reject(new Error('保存消息失败'));
    });
  }

  /**
   * 获取对话的所有消息
   */
  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.messages], 'readonly');
      const store = transaction.objectStore(CONVERSATION_STORES.messages);
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);

      request.onsuccess = () => {
        const messages = request.result as ConversationMessage[];
        // 按时间排序
        messages.sort((a, b) => a.timestamp - b.timestamp);
        console.log('[ConversationDB] 加载', messages.length, '条消息');
        resolve(messages);
      };
      request.onerror = () => reject(new Error('读取消息失败'));
    });
  }

  /**
   * 获取单条消息
   */
  async getMessage(id: string): Promise<ConversationMessage | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.messages], 'readonly');
      const store = transaction.objectStore(CONVERSATION_STORES.messages);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as ConversationMessage || null);
      };
      request.onerror = () => reject(new Error('读取消息失败'));
    });
  }

  /**
   * 更新消息
   */
  async updateMessage(id: string, updates: Partial<ConversationMessage>): Promise<void> {
    const db = await this.ensureDB();
    const existing = await this.getMessage(id);

    if (!existing) {
      throw new Error('消息不存在');
    }

    const updated = { ...existing, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.messages], 'readwrite');
      const store = transaction.objectStore(CONVERSATION_STORES.messages);
      const request = store.put(updated);

      request.onsuccess = () => {
        console.log('[ConversationDB] 消息更新成功:', id);
        resolve();
      };
      request.onerror = () => reject(new Error('更新消息失败'));
    });
  }

  /**
   * 删除消息
   */
  async deleteMessage(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CONVERSATION_STORES.messages], 'readwrite');
      const store = transaction.objectStore(CONVERSATION_STORES.messages);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[ConversationDB] 消息删除成功:', id);
        resolve();
      };
      request.onerror = () => reject(new Error('删除消息失败'));
    });
  }

  // ==================== 工具方法 ====================

  /**
   * 清空所有对话数据
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [CONVERSATION_STORES.conversations, CONVERSATION_STORES.messages],
        'readwrite'
      );

      const conversationsStore = transaction.objectStore(CONVERSATION_STORES.conversations);
      const messagesStore = transaction.objectStore(CONVERSATION_STORES.messages);

      conversationsStore.clear();
      messagesStore.clear();

      transaction.oncomplete = () => {
        console.log('[ConversationDB] 所有数据已清空');
        resolve();
      };
      transaction.onerror = () => reject(new Error('清空数据失败'));
    });
  }

  /**
   * 获取存储统计
   */
  async getStats(): Promise<{
    conversationCount: number;
    messageCount: number;
    totalImageCount: number;
  }> {
    const db = await this.ensureDB();

    const conversations = await this.listConversations(1000);
    let messageCount = 0;
    let totalImageCount = 0;

    for (const conv of conversations) {
      messageCount += conv.messageCount || 0;
      totalImageCount += conv.imageCount || 0;
    }

    return {
      conversationCount: conversations.length,
      messageCount,
      totalImageCount
    };
  }
}

// 单例实例
let conversationDBInstance: ConversationDatabase | null = null;

/**
 * 获取对话数据库实例
 */
export async function getConversationDB(): Promise<ConversationDatabase> {
  if (!conversationDBInstance) {
    conversationDBInstance = new ConversationDatabase();
    await conversationDBInstance.init();
  }
  return conversationDBInstance;
}

/**
 * 检查浏览器是否支持 IndexedDB
 */
export function isConversationDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}
