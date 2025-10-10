"use client";

import React from 'react';

export interface GeneratedImage {
  id: string;
  url: string;
  title: string;
  timestamp: number;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: GeneratedImage[];
  onUseImage: (imageUrl: string) => void;
  onDownload: (url: string) => void;
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
  const ActionButton: React.FC<{ 
    onClick: () => void; 
    children: React.ReactNode; 
    isPrimary?: boolean; 
  }> = ({ onClick, children, isPrimary }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors duration-200 ${
            isPrimary 
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm hover:from-orange-600 hover:to-orange-700' 
            : 'bg-gray-600/40 hover:bg-gray-600/60 text-white'
        }`}
    >
        {children}
    </button>
  );

  return (
    <div className="bg-black/40 p-3 rounded-lg border border-white/10">
        <div className="flex flex-col gap-3">
            <img src={item.url} className="rounded-md w-full object-contain bg-black/20" alt="Generated Result" />
            <div className="text-xs text-gray-400 text-center truncate">{item.title}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
                 <ActionButton onClick={() => onDownload(item.url)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    下载
                </ActionButton>
                <ActionButton onClick={() => onUseImage(item.url)} isPrimary>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2-2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                    </svg>
                    作为输入
                </ActionButton>
            </div>
        </div>
    </div>
  );
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, history, onUseImage, onDownload }) => {
  const handleDownload = (url: string) => {
    const filename = `generated-image-${Date.now()}.png`;
    downloadImage(url, filename);
  };

  return (
    <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-gray-900 border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-semibold text-orange-500">生成历史</h2>
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