/**
 * useLocalHistory Hook
 * 
 * 封装 IndexedDB 操作，提供 React 友好的 API
 * 用于管理本地图片生成历史记录
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDB, HistoryStore, StorageStats, isIndexedDBSupported } from '../storage/indexeddb';
import { getBlobManager } from '../storage/blob-manager';
import type { GeneratedImage } from '@/components/ai/history-panel';

/**
 * Hook 返回值类型
 */
export interface UseLocalHistoryReturn {
  // 状态
  history: GeneratedImage[];
  loading: boolean;
  error: Error | null;
  stats: StorageStats | null;
  supported: boolean;
  
  // 操作
  addHistory: (imageUrl: string, prompt: string, metadata: {
    model?: string;
    modelName?: string;
    mode?: 'txt2img' | 'img2img';
    size?: string;
    parameters?: any;
  }) => Promise<void>;
  removeHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  refreshHistory: () => Promise<void>;
  
  // 查询
  searchHistory: (keyword: string) => Promise<void>;
  filterByModel: (model: string) => Promise<void>;
  showFavorites: () => Promise<void>;
  showAll: () => Promise<void>;
}

/**
 * 将 HistoryStore 转换为 GeneratedImage
 */
async function historyStoreToGeneratedImage(
  historyStore: HistoryStore,
  blobManager: ReturnType<typeof getBlobManager>
): Promise<GeneratedImage> {
  const db = await getDB();
  
  // 尝试从缓存获取URL
  let blobUrl = blobManager.getCachedURL(historyStore.imageId);
  
  // 如果没有缓存，从IndexedDB读取并创建URL
  if (!blobUrl) {
    const blob = await db.getThumbnail(historyStore.imageId);
    if (blob) {
      blobUrl = blobManager.createObjectURL(blob, historyStore.imageId);
    }
  }
  
  return {
    id: historyStore.id,
    url: blobUrl || '',
    title: historyStore.prompt.slice(0, 50),
    prompt: historyStore.prompt,
    model: historyStore.model,
    modelName: historyStore.modelName,
    timestamp: historyStore.timestamp,
    mode: historyStore.mode,
    size: historyStore.size
  };
}

/**
 * useLocalHistory Hook
 */
export function useLocalHistory(): UseLocalHistoryReturn {
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [supported] = useState(() => isIndexedDBSupported());
  
  const blobManagerRef = useRef(getBlobManager());
  const isMountedRef = useRef(true);

  /**
   * 加载历史记录
   */
  const loadHistory = useCallback(async () => {
    if (!supported) {
      setError(new Error('浏览器不支持 IndexedDB'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const db = await getDB();
      const historyList = await db.getHistory(100); // 加载最近100条
      
      // 转换为 GeneratedImage 格式
      const images = await Promise.all(
        historyList.map(h => historyStoreToGeneratedImage(h, blobManagerRef.current))
      );
      
      if (isMountedRef.current) {
        setHistory(images);
      }
    } catch (err) {
      console.error('加载历史记录失败:', err);
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [supported]);

  /**
   * 加载统计信息
   */
  const loadStats = useCallback(async () => {
    if (!supported) return;
    
    try {
      const db = await getDB();
      const newStats = await db.getStorageStats();
      if (isMountedRef.current) {
        setStats(newStats);
      }
    } catch (err) {
      console.error('加载统计信息失败:', err);
    }
  }, [supported]);

  /**
   * 添加历史记录
   */
  const addHistory = useCallback(async (
    imageUrl: string,
    prompt: string,
    metadata: {
      model?: string;
      modelName?: string;
      mode?: 'txt2img' | 'img2img';
      size?: string;
      parameters?: any;
    }
  ) => {
    if (!supported) {
      throw new Error('浏览器不支持 IndexedDB');
    }

    try {
      // 下载图片为 Blob（通过本地代理避免跨域/缓存问题）
      const isHttp = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
      const proxyUrl = isHttp ? `/api/proxy/image?url=${encodeURIComponent(imageUrl)}` : imageUrl;
      const response = await fetch(proxyUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
      const blob = await response.blob();
      
      const db = await getDB();
      
      // 保存图片到 IndexedDB
      const imageId = await db.saveImage(blob);
      
      // 创建本地 blob URL
      const localUrl = blobManagerRef.current.createObjectURL(blob, imageId);
      
      // 保存历史记录元数据
      const historyId = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const historyData: HistoryStore = {
        id: historyId,
        imageId: imageId,
        prompt: prompt,
        model: metadata.model,
        modelName: metadata.modelName,
        mode: metadata.mode,
        size: metadata.size,
        timestamp: Date.now(),
        parameters: metadata.parameters,
        shared: false,
        favorite: false
      };
      
      await db.saveHistory(historyData);
      
      // 更新UI
      const newImage: GeneratedImage = {
        id: historyId,
        url: localUrl,
        title: prompt.slice(0, 50),
        prompt: prompt,
        model: metadata.model,
        modelName: metadata.modelName,
        timestamp: Date.now(),
        mode: metadata.mode,
        size: metadata.size
      };
      
      setHistory(prev => [newImage, ...prev]);
      
      // 更新统计
      await loadStats();
      
    } catch (err) {
      console.error('添加历史记录失败:', err);
      throw err;
    }
  }, [supported, loadStats]);

  /**
   * 删除历史记录
   */
  const removeHistory = useCallback(async (id: string) => {
    if (!supported) return;

    try {
      const db = await getDB();
      const historyItem = await db.getHistoryById(id);
      
      if (historyItem) {
        // 释放 Blob URL
        blobManagerRef.current.revokeObjectURL(historyItem.imageId);
        
        // 从数据库删除（会自动删除关联的图片）
        await db.deleteHistory(id);
        
        // 更新UI
        setHistory(prev => prev.filter(h => h.id !== id));
        
        // 更新统计
        await loadStats();
      }
    } catch (err) {
      console.error('删除历史记录失败:', err);
      throw err;
    }
  }, [supported, loadStats]);

  /**
   * 清空所有历史记录
   */
  const clearHistory = useCallback(async () => {
    if (!supported) return;

    try {
      const db = await getDB();
      
      // 释放所有 Blob URL
      blobManagerRef.current.revokeAll();
      
      // 清空数据库
      await db.clearAll();
      
      // 更新UI
      setHistory([]);
      setStats(null);
      
    } catch (err) {
      console.error('清空历史记录失败:', err);
      throw err;
    }
  }, [supported]);

  /**
   * 切换收藏状态
   */
  const toggleFavorite = useCallback(async (id: string) => {
    if (!supported) return;

    try {
      const db = await getDB();
      const historyItem = await db.getHistoryById(id);
      
      if (historyItem) {
        await db.updateHistory(id, {
          favorite: !historyItem.favorite
        });
        
        // 重新加载历史记录
        await loadHistory();
      }
    } catch (err) {
      console.error('切换收藏失败:', err);
      throw err;
    }
  }, [supported, loadHistory]);

  /**
   * 刷新历史记录
   */
  const refreshHistory = useCallback(async () => {
    await loadHistory();
    await loadStats();
  }, [loadHistory, loadStats]);

  /**
   * 搜索历史记录
   */
  const searchHistory = useCallback(async (keyword: string) => {
    if (!supported) return;

    try {
      setLoading(true);
      const db = await getDB();
      const results = await db.searchByPrompt(keyword);
      
      const images = await Promise.all(
        results.map(h => historyStoreToGeneratedImage(h, blobManagerRef.current))
      );
      
      setHistory(images);
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  /**
   * 按模型筛选
   */
  const filterByModel = useCallback(async (model: string) => {
    if (!supported) return;

    try {
      setLoading(true);
      const db = await getDB();
      const results = await db.getHistoryByModel(model);
      
      const images = await Promise.all(
        results.map(h => historyStoreToGeneratedImage(h, blobManagerRef.current))
      );
      
      setHistory(images);
    } catch (err) {
      console.error('筛选失败:', err);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  /**
   * 显示收藏
   */
  const showFavorites = useCallback(async () => {
    if (!supported) return;

    try {
      setLoading(true);
      const db = await getDB();
      const results = await db.getFavorites();
      
      const images = await Promise.all(
        results.map(h => historyStoreToGeneratedImage(h, blobManagerRef.current))
      );
      
      setHistory(images);
    } catch (err) {
      console.error('加载收藏失败:', err);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  /**
   * 显示全部
   */
  const showAll = useCallback(async () => {
    await loadHistory();
  }, [loadHistory]);

  // 初始化：加载历史记录
  useEffect(() => {
    loadHistory();
    loadStats();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadHistory, loadStats]);

  // 清理：组件卸载时释放 Blob URL
  useEffect(() => {
    return () => {
      // 注意：不要释放所有URL，因为其他组件可能还在使用
      // blobManagerRef.current.revokeAll();
    };
  }, []);

  return {
    // 状态
    history,
    loading,
    error,
    stats,
    supported,
    
    // 操作
    addHistory,
    removeHistory,
    clearHistory,
    toggleFavorite,
    refreshHistory,
    
    // 查询
    searchHistory,
    filterByModel,
    showFavorites,
    showAll
  };
}
