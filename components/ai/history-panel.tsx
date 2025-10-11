"use client";

import React from 'react';

export interface GeneratedImage {
  id: string;
  url: string;
  title: string; // 简短标题(保留兼容性)
  prompt: string; // 完整提示词
  model?: string; // 模型 slug
  modelName?: string; // 模型显示名称
  timestamp: number;
  mode?: 'txt2img' | 'img2img'; // 生成模式
  size?: string; // 图片尺寸
  favorite?: boolean; // 是否收藏
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: GeneratedImage[];
  onUseImage: (imageUrl: string) => void;
  onDownload: (url: string) => void;
  // 新增：筛选与收藏/搜索回调
  onSearch?: (keyword: string) => void;
  onFilterModel?: (model: string) => void;
  onShowFavorites?: () => void;
  onShowAll?: () => void;
  onToggleFavorite?: (id: string) => void;
}

const downloadImage = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const HistoryItem: React.FC<{ 
  item: GeneratedImage; 
  onUseImage: (url: string) => void; 
  onDownload: (url: string) => void; 
}> = ({ item, onUseImage, onDownload }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // 格式化时间
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 提示词截断逻辑
  const prompt = item.prompt || item.title;
  const shouldTruncate = prompt.length > 100;
  const displayPrompt = isExpanded ? prompt : (shouldTruncate ? prompt.slice(0, 100) + '...' : prompt);
  
  const ActionButton: React.FC<{ 
    onClick: () => void; 
    children: React.ReactNode; 
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary';
  }> = ({ onClick, children, icon, variant = 'secondary' }) => (
    <button 
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-lg transition-all duration-200 ${
        variant === 'primary'
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm hover:from-orange-600 hover:to-orange-700 hover:shadow-md' 
          : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
      }`}
    >
      {icon}
      {children}
    </button>
  );

  return (
    <div className="bg-black/40 rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors">
      <div className="flex gap-3 p-3">
        {/* 左侧图片 - 100x100px */}
        <div className="flex-shrink-0">
          <img 
            src={item.url} 
            className="w-[100px] h-[100px] rounded-lg object-cover bg-black/20 cursor-pointer hover:opacity-90 transition-opacity" 
            alt="Generated"
            onClick={() => onUseImage(item.url)}
          />
        </div>
        
        {/* 右侧信息 */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* 时间 */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDate(item.timestamp)}</span>
            {item.mode && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px]">
                {item.mode === 'txt2img' ? '文生图' : '图生图'}
              </span>
            )}
          </div>
          
          {/* 提示词 */}
          <div className="space-y-1">
            <div className="text-xs text-gray-300 leading-relaxed break-words">
              {displayPrompt}
            </div>
            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    收起
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    展开全部
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* 模型信息 */}
          <div className="flex items-center gap-2 text-xs">
            {item.modelName && (
              <>
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span className="text-gray-400">{item.modelName}</span>
              </>
            )}
            {item.size && (
              <span className="text-gray-500">· {item.size}</span>
            )}
            <button
              onClick={() => onToggleFavorite?.(item.id)}
              className={`ml-auto text-xs ${item.favorite ? 'text-yellow-400' : 'text-gray-500'} hover:text-yellow-300`}
              title={item.favorite ? '取消收藏' : '收藏'}
            >
              {item.favorite ? '★' : '☆'}
            </button>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-2 mt-auto">
            <ActionButton 
              onClick={() => onUseImage(item.url)}
              variant="primary"
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }
            >
              使用
            </ActionButton>
            <ActionButton 
              onClick={() => onDownload(item.url)}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              下载
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, history, onUseImage, onDownload, onSearch, onFilterModel, onShowFavorites, onShowAll, onToggleFavorite }) => {
  const handleDownload = (url: string) => {
    const filename = `generated-image-${Date.now()}.png`;
    downloadImage(url, filename);
  };

  return (
    <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-gray-900 border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
          <h2 className="text-xl font-semibold text-orange-500">生成历史</h2>
          <div className="ml-auto flex items-center gap-2">
            <input
              className="rounded-md bg-black/40 px-2 py-1 text-sm text-gray-200 border border-white/10 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="搜索提示词..."
              onChange={(e) => onSearch?.(e.target.value)}
            />
            <button className="text-xs text-gray-400 hover:text-white" onClick={() => onShowAll?.()}>全部</button>
            <button className="text-xs text-gray-400 hover:text-white" onClick={() => onShowFavorites?.()}>收藏</button>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4">
          {history.length === 0 ? (
            <div className="text-center text-gray-400 pt-10 flex flex-col items-center gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>暂无生成历史</p>
            </div>
          ) : (
             <div className="space-y-4">
                {history.map((item) => (
                    <HistoryItem key={item.id} item={item} onUseImage={onUseImage} onDownload={handleDownload} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;