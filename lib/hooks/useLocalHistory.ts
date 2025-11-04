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
    // 链信息（可选）
    threadId?: string;           // 对话/线程ID
    parentHistoryId?: string;    // 父历史记录ID
    ops?: any;                   // 本步编辑操作
  }) => Promise<{ localUrl: string; historyId: string }>;
  removeHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  clearOldDays: (days: number) => Promise<number>;
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
  console.log('[historyStoreToGeneratedImage] 转换开始, imageId:', historyStore.imageId);
  
  const db = await getDB();
  
  // 尝试从缓存获取URL（缩略图优先）
  let blobUrl = blobManager.getCachedURL(historyStore.imageId);
  console.log('[historyStoreToGeneratedImage] 缓存查找结果:', blobUrl ? '命中' : '未命中');
  
  // 如果缓存中没有(页面刷新后),重新从 IndexedDB 加载
  if (!blobUrl) {
    console.log('[historyStoreToGeneratedImage] 从 IndexedDB 重新加载缩略图');
    const blob = await db.getThumbnail(historyStore.imageId);
    console.log('[historyStoreToGeneratedImage] 缩略图加载结果:', blob ? `成功 (${blob.size} bytes)` : '失败/不存在');
    
    if (blob) {
      blobUrl = blobManager.createObjectURL(blob, historyStore.imageId);
      console.log('[historyStoreToGeneratedImage] 新 Blob URL 创建成功:', blobUrl.slice(0, 50));
    } else {
      console.warn('[historyStoreToGeneratedImage] 缩略图不存在, URL 将为空');
    }
  }
  
  const result = {
    id: historyStore.id,
    url: blobUrl || '',
    title: historyStore.prompt.slice(0, 50),
    prompt: historyStore.prompt,
    model: historyStore.model,
    modelName: historyStore.modelName,
    timestamp: historyStore.timestamp,
    mode: historyStore.mode,
    size: historyStore.size,
    favorite: historyStore.favorite,
    // 新增链路信息用于历史时间轴
    threadId: historyStore.threadId,
    parentHistoryId: historyStore.parentHistoryId,
    step: historyStore.step
  };
  
  console.log('[historyStoreToGeneratedImage] 转换完成, 最终URL:', result.url.slice(0, 50) || '(空)');
  return result;
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
    console.log('[useLocalHistory] loadHistory 调用时, isMountedRef.current:', isMountedRef.current);
    console.log('[useLocalHistory] loadHistory 开始执行, supported:', supported);
    
    if (!supported) {
      console.error('[useLocalHistory] IndexedDB 不支持, 终止加载');
      setError(new Error('浏览器不支持 IndexedDB'));
      setLoading(false);
      return;
    }

    try {
      console.log('[useLocalHistory] 设置 loading 状态为 true');
      setLoading(true);
      setError(null);
      
      console.log('[useLocalHistory] 准备获取 IndexedDB 实例');
      const db = await getDB();
      console.log('[useLocalHistory] IndexedDB 实例获取成功');
      
      console.log('[useLocalHistory] 开始从数据库读取历史记录(最多100条)');
      const historyList = await db.getHistory(100); // 加载最近100条
      console.log('[useLocalHistory] 从数据库读取到', historyList.length, '条历史记录');
      
      if (historyList.length > 0) {
        console.log('[useLocalHistory] 第一条记录示例:', {
          id: historyList[0].id,
          imageId: historyList[0].imageId,
          prompt: historyList[0].prompt?.slice(0, 30),
          timestamp: historyList[0].timestamp
        });
      }
      
      // 转换为 GeneratedImage 格式
      console.log('[useLocalHistory] 开始转换历史记录为 GeneratedImage 格式');
      const images = await Promise.all(
        historyList.map(h => historyStoreToGeneratedImage(h, blobManagerRef.current))
      );
      console.log('[useLocalHistory] 转换完成, 生成了', images.length, '个图像对象');
      
      if (images.length > 0) {
        console.log('[useLocalHistory] 第一个图像对象示例:', {
          id: images[0].id,
          url: images[0].url?.slice(0, 50),
          title: images[0].title,
          timestamp: images[0].timestamp
        });
      }
      
      if (isMountedRef.current) {
        console.log('[useLocalHistory] 组件仍然挂载, 更新 history state');
        setHistory(images);
        console.log('[useLocalHistory] history state 更新完成');
      } else {
        console.warn('[useLocalHistory] 组件已卸载, 跳过 state 更新');
      }
    } catch (err) {
      console.error('[useLocalHistory] 加载历史记录失败:', err);
      console.error('[useLocalHistory] 错误详情:', err instanceof Error ? err.message : String(err));
      console.error('[useLocalHistory] 错误堆栈:', err instanceof Error ? err.stack : 'N/A');
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (isMountedRef.current) {
        console.log('[useLocalHistory] 设置 loading 状态为 false');
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
      threadId?: string;
      parentHistoryId?: string;
      ops?: any;
    }
  ): Promise<{ localUrl: string; historyId: string }> => {
    console.log('[useLocalHistory] addHistory 被调用:', { 
      imageUrl: imageUrl.slice(0, 50), 
      prompt: prompt.slice(0, 30), 
      supported, 
      metadata 
    });
    
    if (!supported) {
      console.error('[useLocalHistory] IndexedDB 不支持!');
      throw new Error('浏览器不支持 IndexedDB');
    }

    try {
      // 下载图片为 Blob（通过本地代理避免跨域/缓存问题）
      const isHttp = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
      const proxyUrl = isHttp ? `/api/proxy/image?url=${encodeURIComponent(imageUrl)}` : imageUrl;
      console.log('[useLocalHistory] 开始 fetch 图片:', proxyUrl.slice(0, 80));
      
      const response = await fetch(proxyUrl, { cache: "no-store" });
      if (!response.ok) {
        console.error('[useLocalHistory] fetch 失败:', response.status, response.statusText);
        throw new Error(`fetch failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('[useLocalHistory] 图片下载成功, 大小:', blob.size, 'bytes');
      
      const db = await getDB();
      console.log('[useLocalHistory] 获取 IndexedDB 实例成功');
      
      // 生成缩略图 100x100
      const thumb = await createThumbnail(blob, 100, 100);
      console.log('[useLocalHistory] 缩略图生成:', thumb ? `${thumb.size} bytes` : 'null');
      
      // 保存图片到 IndexedDB（含缩略图）
      const imageId = await db.saveImage(blob, thumb ?? undefined);
      console.log('[useLocalHistory] 图片保存到 IndexedDB, imageId:', imageId);
      
      // 创建本地 blob URL（展示使用缩略图更节省资源，这里仍用原图 URL 以便立即编辑）
      const localUrl = blobManagerRef.current.createObjectURL(blob, imageId);
      console.log('[useLocalHistory] Blob URL 创建成功:', localUrl.slice(0, 50));
      
      // 计算链路 step（如果提供了父历史ID，则 step=父+1，否则为1）
      let step = 1;
      if (metadata.parentHistoryId) {
        try {
          const parent = await db.getHistoryById(metadata.parentHistoryId);
          if (parent && typeof parent.step === 'number' && Number.isFinite(parent.step)) {
            step = (parent.step || 0) + 1;
          } else {
            step = 2; // 父无step字段时，视为第二步
          }
        } catch {}
      }

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
        threadId: metadata.threadId,
        parentHistoryId: metadata.parentHistoryId,
        step,
        ops: metadata.ops,
        parameters: metadata.parameters,
        shared: false,
        favorite: false
      };
      
      await db.saveHistory(historyData);
      console.log('[useLocalHistory] 历史记录保存成功, historyId:', historyId);
      
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
        size: metadata.size,
        favorite: false
      };
      
      setHistory(prev => {
        console.log('[useLocalHistory] 更新 UI state, 新增一条记录');
        return [newImage, ...prev];
      });
      
      // 更新统计
      await loadStats();
      console.log('[useLocalHistory] 统计信息已更新');
      
      return { localUrl, historyId };
    } catch (err) {
      console.error('[useLocalHistory] 添加历史记录失败:', err);
      console.error('[useLocalHistory] 错误详情:', err instanceof Error ? err.message : String(err));
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

  /** 清理指定天数之前的非收藏记录 */
  const clearOldDays = useCallback(async (days: number) => {
    if (!supported) return 0;
    const db = await getDB();
    const before = Date.now() - days * 24 * 60 * 60 * 1000;
    const removed = await db.clearOldHistory(before);
    await loadHistory();
    await loadStats();
    return removed;
  }, [supported, loadHistory, loadStats]);

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
    console.log('[useLocalHistory] useEffect 初始化(仅运行一次), supported:', supported);
    console.log('[useLocalHistory] useEffect 运行前, isMountedRef.current:', isMountedRef.current);
    
    // 确保组件挂载状态
    isMountedRef.current = true;
    
    if (!supported) {
      console.warn('[useLocalHistory] IndexedDB 不支持, 跳过初始化加载');
      return;
    }
    
    // 初始化加载
    loadHistory();
    loadStats();
    
    return () => {
      console.log('[useLocalHistory] 组件真正卸载');
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组 - 仅在组件挂载时运行一次

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
    showAll,
    clearOldDays
  };
}

/** 生成缩略图 (canvas) */
async function createThumbnail(srcBlob: Blob, width: number, height: number): Promise<Blob | null> {
  try {
    const img = await blobToImage(srcBlob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = width;
    canvas.height = height;
    // cover 裁剪填充
    const ratio = Math.max(width / img.width, height / img.height);
    const newW = img.width * ratio;
    const newH = img.height * ratio;
    const dx = (width - newW) / 2;
    const dy = (height - newH) / 2;
    ctx.drawImage(img, dx, dy, newW, newH);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b)=>resolve(b), 'image/png', 0.85));
  } catch {
    return null;
  }
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
