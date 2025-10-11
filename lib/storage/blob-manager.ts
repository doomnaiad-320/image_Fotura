/**
 * Blob URL 管理器
 * 
 * 管理 blob:// URL 的生命周期，防止内存泄漏
 * 提供缓存机制，避免重复创建URL
 */

export class BlobManager {
  private urlCache: Map<string, string> = new Map();  // imageId -> blobUrl
  private refCount: Map<string, number> = new Map();  // imageId -> 引用计数

  /**
   * 创建 Blob URL
   * @param blob 图片 Blob
   * @param imageId 图片ID（用于缓存）
   * @returns blob:// URL
   */
  createObjectURL(blob: Blob, imageId: string): string {
    // 如果已有缓存，增加引用计数并返回
    const cached = this.urlCache.get(imageId);
    if (cached) {
      this.increaseRefCount(imageId);
      return cached;
    }

    // 创建新的 URL
    const url = URL.createObjectURL(blob);
    this.urlCache.set(imageId, url);
    this.refCount.set(imageId, 1);
    
    return url;
  }

  /**
   * 获取缓存的 URL
   * @param imageId 图片ID
   * @returns blob:// URL 或 null
   */
  getCachedURL(imageId: string): string | null {
    return this.urlCache.get(imageId) || null;
  }

  /**
   * 增加引用计数
   * @param imageId 图片ID
   */
  private increaseRefCount(imageId: string): void {
    const count = this.refCount.get(imageId) || 0;
    this.refCount.set(imageId, count + 1);
  }

  /**
   * 减少引用计数
   * @param imageId 图片ID
   * @returns 是否已释放URL
   */
  private decreaseRefCount(imageId: string): boolean {
    const count = this.refCount.get(imageId) || 0;
    if (count <= 1) {
      // 引用计数归零，释放URL
      this.refCount.delete(imageId);
      return true;
    }
    this.refCount.set(imageId, count - 1);
    return false;
  }

  /**
   * 释放指定图片的 URL
   * @param imageId 图片ID
   */
  revokeObjectURL(imageId: string): void {
    const shouldRevoke = this.decreaseRefCount(imageId);
    
    if (shouldRevoke) {
      const url = this.urlCache.get(imageId);
      if (url) {
        URL.revokeObjectURL(url);
        this.urlCache.delete(imageId);
      }
    }
  }

  /**
   * 释放多个 URL
   * @param imageIds 图片ID数组
   */
  revokeObjectURLs(imageIds: string[]): void {
    imageIds.forEach(id => this.revokeObjectURL(id));
  }

  /**
   * 释放所有 URL
   */
  revokeAll(): void {
    this.urlCache.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.urlCache.clear();
    this.refCount.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { totalCached: number; totalRefs: number } {
    let totalRefs = 0;
    this.refCount.forEach(count => {
      totalRefs += count;
    });

    return {
      totalCached: this.urlCache.size,
      totalRefs
    };
  }

  /**
   * 清理未使用的 URL（引用计数为0的）
   */
  cleanup(): number {
    let cleaned = 0;
    const toClean: string[] = [];

    this.refCount.forEach((count, imageId) => {
      if (count === 0) {
        toClean.push(imageId);
      }
    });

    toClean.forEach(imageId => {
      const url = this.urlCache.get(imageId);
      if (url) {
        URL.revokeObjectURL(url);
        this.urlCache.delete(imageId);
        this.refCount.delete(imageId);
        cleaned++;
      }
    });

    return cleaned;
  }
}

// 导出单例实例
let blobManagerInstance: BlobManager | null = null;

/**
 * 获取 BlobManager 实例（单例模式）
 */
export function getBlobManager(): BlobManager {
  if (!blobManagerInstance) {
    blobManagerInstance = new BlobManager();
  }
  return blobManagerInstance;
}
