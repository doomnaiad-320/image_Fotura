"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResultDisplayProps {
  imageUrl: string | null;
  onUseImageAsInput: (imageUrl: string) => void;
  onImageClick: (imageUrl: string) => void;
  originalImageUrl?: string | null;
}

type ViewMode = 'result' | 'side-by-side' | 'slider';

const downloadImage = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  imageUrl, 
  onUseImageAsInput, 
  onImageClick, 
  originalImageUrl 
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('result');
  
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      setSliderPosition(percent);
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = () => setIsDragging(true);

  const handleDownload = () => {
    if (!imageUrl) return;
    const filename = `generated-image-${Date.now()}.png`;
    downloadImage(imageUrl, filename);
  };

  const handleDownloadComparison = useCallback(async () => {
    if (!imageUrl || !originalImageUrl) return;

    const imagesToLoad = [
      { url: originalImageUrl, img: new Image() },
      { url: imageUrl, img: new Image() }
    ];

    const loadPromises = imagesToLoad.map(item => {
      item.img.crossOrigin = 'anonymous';
      item.img.src = item.url;
      return new Promise(resolve => item.img.onload = resolve);
    });

    await Promise.all(loadPromises);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const totalWidth = imagesToLoad.reduce((sum, item) => sum + item.img.width, 0);
    const maxHeight = Math.max(...imagesToLoad.map(item => item.img.height));

    canvas.width = totalWidth;
    canvas.height = maxHeight;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentX = 0;
    for (const item of imagesToLoad) {
        ctx.drawImage(item.img, currentX, (maxHeight - item.img.height) / 2);
        currentX += item.img.width;
    }

    downloadImage(canvas.toDataURL('image/png'), `comparison-image-${Date.now()}.png`);
  }, [originalImageUrl, imageUrl]);

  const ActionButton: React.FC<{ 
    onClick: () => void; 
    children: React.ReactNode; 
    isPrimary?: boolean; 
    className?: string 
  }> = ({ onClick, children, isPrimary, className }) => (
    <button 
        onClick={onClick}
        className={`flex-1 py-2 px-4 font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            isPrimary 
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700' 
            : 'bg-gray-600/40 hover:bg-gray-600/60 text-white'
        } ${className || ''}`}
    >
        {children}
    </button>
  );
  
  const ViewSwitcherButton: React.FC<{ 
    mode: ViewMode; 
    currentMode: ViewMode; 
    onClick: () => void; 
    children: React.ReactNode 
  }> = ({ mode, currentMode, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-200 ${
      currentMode === mode
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
          : 'text-white hover:bg-gray-600/40'
      }`}
    >
      {children}
    </button>
  );

  const ViewSwitcher = () => (
    <div className="w-full flex justify-center">
        <div className="p-1 bg-black/40 rounded-lg flex items-center gap-1">
            <ViewSwitcherButton mode="result" currentMode={viewMode} onClick={() => setViewMode('result')}>
                结果
            </ViewSwitcherButton>
            <ViewSwitcherButton mode="side-by-side" currentMode={viewMode} onClick={() => setViewMode('side-by-side')}>
                对比
            </ViewSwitcherButton>
            <ViewSwitcherButton mode="slider" currentMode={viewMode} onClick={() => setViewMode('slider')}>
                滑块
            </ViewSwitcherButton>
        </div>
    </div>
  );

  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/10">
        <p className="text-gray-400 text-sm">生成结果将在这里展示</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center gap-4">
      {imageUrl && originalImageUrl && <ViewSwitcher />}
      
      <div className="w-full flex-grow relative">
        {viewMode === 'result' && (
          <div 
            className="w-full h-full relative bg-black/20 rounded-lg overflow-hidden cursor-pointer group border border-white/10 flex items-center justify-center"
            onClick={() => onImageClick(imageUrl)}
          >
            <img src={imageUrl} alt="Generated result" className="max-w-full max-h-full object-contain" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
               </svg>
            </div>
          </div>
        )}

        {viewMode === 'side-by-side' && originalImageUrl && (
          <div className="w-full h-full grid grid-cols-2 gap-2">
            <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                <img src={originalImageUrl} alt="Original" className="max-w-full max-h-full object-contain"/>
                <div className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-2 py-1 rounded">原图</div>
            </div>
            <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                <img src={imageUrl} alt="Generated" className="max-w-full max-h-full object-contain"/>
                <div className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-2 py-1 rounded">生成结果</div>
            </div>
          </div>
        )}

        {viewMode === 'slider' && originalImageUrl && (
          <div ref={sliderContainerRef} onMouseDown={handleMouseDown} className="relative w-full h-full overflow-hidden rounded-lg cursor-ew-resize border border-white/10 select-none bg-black/20">
            <div className="absolute inset-0 flex items-center justify-center">
                <img src={originalImageUrl} alt="Original" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
              <img src={imageUrl} alt="Generated" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="absolute top-0 bottom-0 bg-orange-500 w-1 cursor-ew-resize" style={{ left: `calc(${sliderPosition}% - 2px)` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 bg-orange-500 h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full flex flex-col md:flex-row gap-3 mt-2">
        {viewMode === 'side-by-side' && originalImageUrl && (
            <ActionButton onClick={handleDownloadComparison}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM15 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" />
                </svg>
                <span>下载对比图</span>
            </ActionButton>
        )}
        <ActionButton onClick={handleDownload} className={viewMode === 'side-by-side' ? 'hidden md:flex' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span>下载图片</span>
        </ActionButton>
        <ActionButton onClick={() => onUseImageAsInput(imageUrl)} isPrimary>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2-2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
          <span>作为输入</span>
        </ActionButton>
      </div>
    </div>
  );
};

export default ResultDisplay;