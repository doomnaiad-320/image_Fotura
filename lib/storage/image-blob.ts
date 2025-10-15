/**
 * 图片 Blob 存储辅助工具
 * 
 * 解决 blob URL 刷新失效问题：
 * - 保存时将 blob URL 转换为 Blob 对象
 * - 恢复时从 Blob 重新生成 blob URL
 */

const BLOB_STORE_NAME = 'imageBlobs';
const DB_NAME = 'aigc-studio-image-blobs';
const DB_VERSION = 1;

/**
 * 图片 Blob 存储类
 */
export class ImageBlobStore {
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
        reject(new Error('无法打开图片 Blob 数据库'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ImageBlobStore] 数据库初始化成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
          db.createObjectStore(BLOB_STORE_NAME, { keyPath: 'id' });
          console.log('[ImageBlobStore] 创建 imageBlobs 表');
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
      throw new Error('图片 Blob 数据库初始化失败');
    }
    return this.db;
  }

  /**
   * 从 blob URL 保存 Blob 对象
   */
  async saveBlobFromURL(id: string, blobURL: string): Promise<void> {
    try {
      // 从 blob URL 获取 Blob 对象
      const response = await fetch(blobURL);
      const blob = await response.blob();

      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([BLOB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(BLOB_STORE_NAME);
        
        const request = store.put({
          id,
          blob,
          timestamp: Date.now(),
        });

        request.onsuccess = () => {
          console.log('[ImageBlobStore] Blob 保存成功:', id);
          resolve();
        };
        request.onerror = () => {
          console.error('[ImageBlobStore] Blob 保存失败:', id);
          reject(new Error('保存 Blob 失败'));
        };
      });
    } catch (error) {
      console.error('[ImageBlobStore] 从 URL 获取 Blob 失败:', error);
      throw error;
    }
  }

  /**
   * 获取 Blob 对象并生成新的 blob URL
   */
  async getBlobURL(id: string): Promise<string | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BLOB_STORE_NAME], 'readonly');
      const store = transaction.objectStore(BLOB_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob) {
          // 从 Blob 重新生成 blob URL
          const url = URL.createObjectURL(result.blob);
          console.log('[ImageBlobStore] 生成新的 blob URL:', id);
          resolve(url);
        } else {
          console.warn('[ImageBlobStore] 未找到 Blob:', id);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[ImageBlobStore] 读取 Blob 失败:', id);
        reject(new Error('读取 Blob 失败'));
      };
    });
  }

  /**
   * 删除 Blob
   */
  async deleteBlob(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BLOB_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(BLOB_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[ImageBlobStore] Blob 删除成功:', id);
        resolve();
      };
      request.onerror = () => reject(new Error('删除 Blob 失败'));
    });
  }

  /**
   * 批量删除指定消息 ID 列表的 Blob
   */
  async deleteBlobsByMessageIds(messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
      try {
        await this.deleteBlob(id);
      } catch (error) {
        console.error('[ImageBlobStore] 删除 Blob 失败:', id, error);
      }
    }
  }

  /**
   * 清空所有 Blob
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BLOB_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(BLOB_STORE_NAME);
      store.clear();

      transaction.oncomplete = () => {
        console.log('[ImageBlobStore] 所有 Blob 已清空');
        resolve();
      };
      transaction.onerror = () => reject(new Error('清空 Blob 失败'));
    });
  }

  /**
   * 获取存储统计
   */
  async getStats(): Promise<{ count: number; totalSize: number }> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BLOB_STORE_NAME], 'readonly');
      const store = transaction.objectStore(BLOB_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result;
        const count = results.length;
        const totalSize = results.reduce((sum, item) => {
          return sum + (item.blob?.size || 0);
        }, 0);

        resolve({ count, totalSize });
      };

      request.onerror = () => reject(new Error('获取统计失败'));
    });
  }
}

// 单例导出
export const imageBlobStore = new ImageBlobStore();
