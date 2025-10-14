/**
 * 对话式工作台核心类型定义
 */

/**
 * 对话消息
 */
export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // 用户输入的提示词或系统回复
  timestamp: number;
  
  // 生成结果相关
  imageUrl?: string; // 生成的图片URL (可能是 blob:// 本地URL)
  imageId?: string; // IndexedDB中的图片ID
  generationParams?: {
    model: string;
    modelName: string;
    size: string;
    mode: 'txt2img' | 'img2img';
    aspectRatio: string;
  };
  
  // 编辑链相关 (核心功能!)
  editChain?: EditChain;
  
  // 发布状态
  published?: boolean;
  assetId?: string; // 发布到首页后的Asset ID
  
  // UI状态
  isGenerating?: boolean; // 正在生成中
  error?: string; // 错误信息
}

/**
 * 编辑链 - 记录完整的编辑历史
 */
export interface EditChain {
  basePrompt: string; // 初始提示词 (第一次文生图)
  edits: EditStep[]; // 后续编辑步骤
  fullPrompt: string; // 累积的完整提示词 (用于发布)
  parentMessageId?: string; // 基于哪条消息编辑 (用于链式追溯)
  originalImageId?: string; // 原始图片ID (第一张图)
}

/**
 * 单个编辑步骤
 */
export interface EditStep {
  prompt: string; // 这一步的编辑提示
  messageId: string; // 关联到哪条消息
  timestamp: number;
  mode: 'txt2img' | 'img2img';
}

/**
 * 对话会话
 */
export interface Conversation {
  id: string;
  title: string; // 自动生成或用户命名
  messageIds: string[]; // 消息ID列表 (按时间排序)
  createdAt: number;
  updatedAt: number;
  lastActiveModel?: string; // 最后使用的模型
  
  // 统计信息
  messageCount?: number;
  imageCount?: number;
}

/**
 * 发布请求数据
 */
export interface PublishRequest {
  messageId: string;
  conversationId: string;
  imageUrl: string;
  fullPrompt: string;
  editChain: EditChain;
  model: string;
  modelName: string;
  size: string;
  mode: 'txt2img' | 'img2img';
  tags?: string[]; // 用户自定义标签
  isPublic?: boolean; // 是否公开
}

/**
 * 发布响应
 */
export interface PublishResponse {
  success: boolean;
  assetId?: string;
  error?: string;
}
