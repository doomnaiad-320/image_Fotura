/**
 * IndexedDB 封装类 - 本地存储图片和历史记录
 * 
 * 数据库结构:
 * - images: 存储图片 Blob
 * - history: 存储生成历史元数据
 */

const DB_NAME = 'aigc-studio-local';
const DB_VERSION = 1;

export const STORES = {
  images: 'images',
  history: 'history'
} as const;

// 图片存储结构
export interface ImageStore {
  id: string;              // 图片ID (主键)
  blob: Blob;              // 图片二进制数据
  mimeType: string;        // MIME类型
  size: number;            // 文件大小(字节)
  createdAt: number;       // 创建时间戳
  thumbnail?: Blob;        // 缩略图 (可选，用于优化)
}

// 历史记录存储结构
export interface HistoryStore {
  id: string;              // 历史记录ID (主键)
  imageId: string;         // 关联的图片ID
  prompt: string;          // 完整提示词
  negativePrompt?: string; // 负面提示词
  model?: string;          // 模型slug
  modelName?: string;      // 模型显示名称
  mode?: 'txt2img' | 'img2img';  // 生成模式
  size?: string;           // 图片尺寸
  timestamp: number;       // 生成时间戳
  
  // 生成参数 (为重现功能保留)
  parameters?: {
    aspectRatio?: string;
    seed?: number;
    steps?: number;
    cfg?: number;
  };
  
  // 分享状态 (为未来功能预留)
  shared: boolean;         // 是否已分享到服务端
  serverImageId?: string;  // 服务端图片ID
  
  // 本地状态
  favorite: boolean;       // 是否收藏
  tags?: string[];         // 用户自定义标签
}

// 存储统计信息
export interface StorageStats {
  totalImages: number;
  totalHistory: number;
  estimatedSize: number;    // 字节
  usagePercentage: number;  // 使用百分比
}

/**
 * 本地数据库类
 */
export class LocalDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) {
      return; // 已初始化
    }

    if (this.initPromise) {
      return this.initPromise; // 正在初始化
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('浏览器不支持 IndexedDB'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('无法打开数据库'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建 images 表
        if (!db.objectStoreNames.contains(STORES.images)) {
          const imagesStore = db.createObjectStore(STORES.images, { keyPath: 'id' });
          imagesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 创建 history 表
        if (!db.objectStoreNames.contains(STORES.history)) {
          const historyStore = db.createObjectStore(STORES.history, { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('imageId', 'imageId', { unique: false });
          historyStore.createIndex('model', 'model', { unique: false });
          historyStore.createIndex('shared', 'shared', { unique: false });
          historyStore.createIndex('favorite', 'favorite', { unique: false });
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
      throw new Error('数据库初始化失败');
    }
    return this.db;
  }

  // ==================== 图片操作 ====================

  /**
   * 保存图片
   * @param blob 图片 Blob
   * @param thumbnail 可选的缩略图
   * @returns 图片ID
   */
  async saveImage(blob: Blob, thumbnail?: Blob): Promise<string> {
    const db = await this.ensureDB();
    const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const imageData: ImageStore = {
      id,
      blob,
      mimeType: blob.type || 'image/png',
      size: blob.size,
      createdAt: Date.now(),
      thumbnail
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.images], 'readwrite');
      const store = transaction.objectStore(STORES.images);
      const request = store.add(imageData);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(new Error('保存图片失败'));
    });
  }

  /**
   * 获取图片
   * @param imageId 图片ID
   * @returns 图片 Blob
   */
  async getImage(imageId: string): Promise<Blob | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.images], 'readonly');
      const store = transaction.objectStore(STORES.images);
      const request = store.get(imageId);

      request.onsuccess = () => {
        const result = request.result as ImageStore | undefined;
        resolve(result?.blob || null);
      };
      request.onerror = () => reject(new Error('读取图片失败'));
    });
  }

  /**
   * 获取缩略图
   * @param imageId 图片ID
   * @returns 缩略图 Blob
   */
  async getThumbnail(imageId: string): Promise<Blob | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.images], 'readonly');
      const store = transaction.objectStore(STORES.images);
      const request = store.get(imageId);

      request.onsuccess = () => {
        const result = request.result as ImageStore | undefined;
        resolve(result?.thumbnail || result?.blob || null);
      };
      request.onerror = () => reject(new Error('读取缩略图失败'));
    });
  }

  /**
   * 删除图片
   * @param imageId 图片ID
   */
  async deleteImage(imageId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.images], 'readwrite');
      const store = transaction.objectStore(STORES.images);
      const request = store.delete(imageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('删除图片失败'));
    });
  }

  // ==================== 历史记录操作 ====================

  /**
   * 保存历史记录
   * @param history 历史记录数据
   */
  async saveHistory(history: HistoryStore): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.history], 'readwrite');
      const store = transaction.objectStore(STORES.history);
      const request = store.add(history);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('保存历史记录失败'));
    });
  }

  /**
   * 获取历史记录列表
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 历史记录数组
   */
  async getHistory(limit = 50, offset = 0): Promise<HistoryStore[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.history], 'readonly');
      const store = transaction.objectStore(STORES.history);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // 按时间倒序

      const results: HistoryStore[] = [];
      let skipped = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          if (skipped < offset) {
            skipped++;
            cursor.continue();
          } else if (results.length < limit) {
            results.push(cursor.value as HistoryStore);
            cursor.continue();
          } else {
            resolve(results);
          }
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(new Error('读取历史记录失败'));
    });
  }

  /**
   * 根据ID获取历史记录
   * @param id 历史记录ID
   * @returns 历史记录
   */
  async getHistoryById(id: string): Promise<HistoryStore | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.history], 'readonly');
      const store = transaction.objectStore(STORES.history);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as HistoryStore || null);
      };
      request.onerror = () => reject(new Error('读取历史记录失败'));
    });
  }

  /**
   * 更新历史记录
   * @param id 历史记录ID
   * @param updates 更新的字段
   */
  async updateHistory(id: string, updates: Partial<HistoryStore>): Promise<void> {
    const db = await this.ensureDB();
    const existing = await this.getHistoryById(id);
    
    if (!existing) {
      throw new Error('历史记录不存在');
    }

    const updated = { ...existing, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.history], 'readwrite');
      const store = transaction.objectStore(STORES.history);
      const request = store.put(updated);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('更新历史记录失败'));
    });
  }

  /**
   * 删除历史记录
   * @param id 历史记录ID
   */
  async deleteHistory(id: string): Promise<void> {
    const db = await this.ensureDB();
    const history = await this.getHistoryById(id);
    
    if (history) {
      // 同时删除关联的图片
      await this.deleteImage(history.imageId);
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.history], 'readwrite');
      const store = transaction.objectStore(STORES.history);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('删除历史记录失败'));
    });
  }

  // ==================== 查询操作 ====================

  /**
   * 根据模型查询历史记录
   * @param model 模型slug
   * @returns 历史记录数组
   */
  async getHistoryByModel(model: string): Promise<HistoryStore[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.history], 'readonly');
      const store = transaction.objectStore(STORES.history);
      const index = store.index('model');
      const request = index.getAll(model);

      request.onsuccess = () => resolve(request.result as HistoryStore[]);
      request.onerror = () => reject(new Error('查询失败'));
    });
  }

  /**
   * 获取收藏的历史记录
   * @returns 历史记录数组
   */
  async getFavorites(): Promise<HistoryStore[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.history], 'readonly');
      const store = transaction.objectStore(STORES.history);
      const index = store.index('favorite');
      const request = index.getAll(true);

      request.onsuccess = () => resolve(request.result as HistoryStore[]);
      request.onerror = () => reject(new Error('查询失败'));
    });
  }

  /**
   * 搜索历史记录（根据提示词）
   * @param keyword 关键词
   * @returns 历史记录数组
   */
  async searchByPrompt(keyword: string): Promise<HistoryStore[]> {
    const allHistory = await this.getHistory(1000); // 获取更多记录用于搜索
    const lowerKeyword = keyword.toLowerCase();
    
    return allHistory.filter(h => 
      h.prompt.toLowerCase().includes(lowerKeyword)
    );
  }

  // ==================== 统计和管理 ====================

  /**
   * 获取存储统计信息
   * @returns 统计信息
   */
  async getStorageStats(): Promise<StorageStats> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.images, STORES.history], 'readonly');
      
      const imagesStore = transaction.objectStore(STORES.images);
      const historyStore = transaction.objectStore(STORES.history);
      
      const imagesCountRequest = imagesStore.count();
      const historyCountRequest = historyStore.count();
      
      let totalImages = 0;
      let totalHistory = 0;
      let estimatedSize = 0;

      imagesCountRequest.onsuccess = () => {
        totalImages = imagesCountRequest.result;
      };

      historyCountRequest.onsuccess = () => {
        totalHistory = historyCountRequest.result;
      };

      transaction.oncomplete = async () => {
        // 估算存储大小
        const allImages = await this.getAllImages();
        estimatedSize = allImages.reduce((sum, img) => sum + img.size, 0);

        // 计算使用百分比（假设最大500MB）
        const maxSize = 500 * 1024 * 1024;
        const usagePercentage = (estimatedSize / maxSize) * 100;

        resolve({
          totalImages,
          totalHistory,
          estimatedSize,
          usagePercentage: Math.min(usagePercentage, 100)
        });
      };

      transaction.onerror = () => reject(new Error('统计失败'));
    });
  }

  /**
   * 获取所有图片（内部使用）
   */
  private async getAllImages(): Promise<ImageStore[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.images], 'readonly');
      const store = transaction.objectStore(STORES.images);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as ImageStore[]);
      request.onerror = () => reject(new Error('读取失败'));
    });
  }

  /**
   * 清理旧的历史记录
   * @param beforeTimestamp 删除此时间戳之前的记录
   * @returns 删除的数量
   */
  async clearOldHistory(beforeTimestamp: number): Promise<number> {
    const allHistory = await this.getHistory(1000);
    const oldHistory = allHistory.filter(h => h.timestamp < beforeTimestamp && !h.favorite);
    
    for (const history of oldHistory) {
      await this.deleteHistory(history.id);
    }
    
    return oldHistory.length;
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.images, STORES.history], 'readwrite');
      
      const imagesStore = transaction.objectStore(STORES.images);
      const historyStore = transaction.objectStore(STORES.history);
      
      imagesStore.clear();
      historyStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('清空失败'));
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// 导出单例实例
let dbInstance: LocalDatabase | null = null;

/**
 * 获取数据库实例（单例模式）
 */
export async function getDB(): Promise<LocalDatabase> {
  if (!dbInstance) {
    dbInstance = new LocalDatabase();
    await dbInstance.init();
  }
  return dbInstance;
}

/**
 * 检查浏览器是否支持 IndexedDB
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && !!window.indexedDB;
}
