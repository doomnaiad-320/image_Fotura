/**
 * Prompt 链管理 - 核心功能模块
 * 
 * 处理多次编辑的提示词累积和链式追溯
 */

import type { EditChain, EditStep, ConversationMessage } from '@/types/conversation';

/**
 * 构建完整的提示词
 * 
 * 策略: 基础提示词 + 所有编辑步骤的自然拼接
 * 
 * @param basePrompt 初始提示词
 * @param edits 编辑步骤数组
 * @returns 完整的累积提示词
 */
export function buildFullPrompt(
  basePrompt: string,
  edits: EditStep[]
): string {
  if (edits.length === 0) {
    return basePrompt;
  }
  
  // 策略1: 简单拼接 (适合大多数场景)
  const editPrompts = edits.map(e => e.prompt.trim()).filter(Boolean);
  
  if (editPrompts.length === 0) {
    return basePrompt;
  }
  
  // 智能拼接: 避免重复的连接词
  const combined = `${basePrompt}, ${editPrompts.join(', ')}`;
  
  return combined;
}

/**
 * 从消息历史中重建编辑链
 * 
 * 向上追溯找到所有父消息，构建完整的编辑链
 * 
 * @param messages 消息列表
 * @param targetMessageId 目标消息ID
 * @returns 完整的编辑链
 */
export function reconstructEditChain(
  messages: ConversationMessage[],
  targetMessageId: string
): EditChain | null {
  const targetMsg = messages.find(m => m.id === targetMessageId);
  
  if (!targetMsg) {
    console.error('[reconstructEditChain] 目标消息不存在:', targetMessageId);
    return null;
  }
  
  // 如果消息本身已有编辑链，直接返回
  if (targetMsg.editChain) {
    return targetMsg.editChain;
  }
  
  // 向上追溯构建编辑链
  const chain: EditStep[] = [];
  let currentMsg: ConversationMessage | undefined = targetMsg;
  let basePrompt = '';
  let originalImageId: string | undefined;
  
  // 追溯到最初的消息(没有 parentMessageId 的消息)
  while (currentMsg) {
    const parentId = currentMsg.editChain?.parentMessageId;
    
    if (!parentId) {
      // 找到起点
      basePrompt = currentMsg.content;
      originalImageId = currentMsg.imageId;
      break;
    }
    
    // 添加当前步骤到链中
    if (currentMsg.role === 'assistant' && currentMsg.imageUrl) {
      chain.unshift({
        prompt: currentMsg.content,
        messageId: currentMsg.id,
        timestamp: currentMsg.timestamp,
        mode: currentMsg.generationParams?.mode || 'img2img'
      });
    }
    
    // 继续向上追溯
    currentMsg = messages.find(m => m.id === parentId);
  }
  
  const fullPrompt = buildFullPrompt(basePrompt, chain);
  
  return {
    basePrompt,
    edits: chain,
    fullPrompt,
    parentMessageId: targetMsg.editChain?.parentMessageId,
    originalImageId
  };
}

/**
 * 创建新的编辑链
 * 
 * 当用户点击"作为输入"时调用
 * 
 * @param parentMessage 父消息(要编辑的图片所在消息)
 * @param newPrompt 新的编辑提示词
 * @param newMessageId 新生成的消息ID
 * @returns 新的编辑链
 */
export function createEditChain(
  parentMessage: ConversationMessage,
  newPrompt: string,
  newMessageId: string
): EditChain {
  // 如果父消息已有编辑链，在其基础上扩展
  if (parentMessage.editChain) {
    const { basePrompt, edits, originalImageId } = parentMessage.editChain;
    
    const newEdits: EditStep[] = [
      ...edits,
      {
        prompt: newPrompt,
        messageId: newMessageId,
        timestamp: Date.now(),
        mode: 'img2img'
      }
    ];
    
    return {
      basePrompt,
      edits: newEdits,
      fullPrompt: buildFullPrompt(basePrompt, newEdits),
      parentMessageId: parentMessage.id,
      originalImageId
    };
  }
  
  // 父消息是第一张图，创建新链
  return {
    basePrompt: parentMessage.content,
    edits: [
      {
        prompt: newPrompt,
        messageId: newMessageId,
        timestamp: Date.now(),
        mode: 'img2img'
      }
    ],
    fullPrompt: buildFullPrompt(parentMessage.content, [
      {
        prompt: newPrompt,
        messageId: newMessageId,
        timestamp: Date.now(),
        mode: 'img2img'
      }
    ]),
    parentMessageId: parentMessage.id,
    originalImageId: parentMessage.imageId
  };
}

/**
 * 获取编辑链的展示数据 (用于时间轴UI)
 * 
 * @param editChain 编辑链
 * @returns 时间轴节点数组
 */
export function getChainTimeline(editChain: EditChain): Array<{
  id: string;
  label: string;
  prompt: string;
  timestamp: number;
  isBase: boolean;
}> {
  const timeline: Array<{
    id: string;
    label: string;
    prompt: string;
    timestamp: number;
    isBase: boolean;
  }> = [];
  
  // 添加基础节点
  timeline.push({
    id: 'base',
    label: '原图',
    prompt: editChain.basePrompt,
    timestamp: 0,
    isBase: true
  });
  
  // 添加编辑步骤
  editChain.edits.forEach((step, index) => {
    timeline.push({
      id: step.messageId,
      label: `编辑 ${index + 1}`,
      prompt: step.prompt,
      timestamp: step.timestamp,
      isBase: false
    });
  });
  
  return timeline;
}

/**
 * 生成会话标题 (基于第一条提示词)
 * 
 * @param firstPrompt 第一条提示词
 * @returns 会话标题
 */
export function generateConversationTitle(firstPrompt: string): string {
  // 截取前30个字符作为标题
  const maxLength = 30;
  const title = firstPrompt.trim();
  
  if (title.length <= maxLength) {
    return title;
  }
  
  return title.slice(0, maxLength) + '...';
}
