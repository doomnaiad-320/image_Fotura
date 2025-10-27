import { getPromptOptimizerModel } from "./models";
import { resolveModel, createOpenAIClient } from "./client";

/**
 * 使用 LLM 智能合并原始 Prompt 和用户修改指令
 * @param originalPrompt 原始提示词
 * @param userModification 用户的修改指令
 * @returns 合并后的完整提示词
 */
export async function mergePromptWithLLM(
  originalPrompt: string,
  userModification: string
): Promise<string> {
  // 获取系统配置的 Prompt 优化器模型
  const optimizerModel = await getPromptOptimizerModel();
  
  if (!optimizerModel) {
    throw new Error(
      "未配置 Prompt 优化器模型，请在管理后台设置一个文本模型（文本对话模型）作为 Prompt 优化器"
    );
  }

  // 通过系统模型解析获取完整上下文与客户端
  const context = await resolveModel(optimizerModel.slug);
  const client = createOpenAIClient(context);
  if (!client) {
    throw new Error("Prompt 优化器客户端初始化失败");
  }

  // 构建 System Prompt - 只输出完整 Prompt，不要任何解释
  const systemPrompt = `You are a professional image prompt optimizer.

**Task:**
Given an original image description and a modification instruction, output ONLY the complete new description.

**Rules:**
1. Preserve all details from the original description that are not mentioned in the modification
2. Replace conflicting attributes (e.g., colors, styles, backgrounds)
3. If the modification is additive (e.g., "add", "include"), append to the original
4. If the modification is replacement (e.g., "change to", "replace with"), replace the conflicting part
5. Output ONLY the complete new description - NO explanations, NO reasoning, NO extra text
6. Keep the description concise and suitable for image generation models
7. Maintain the same language as the original description (English if original is English, Chinese if Chinese)

**CRITICAL:** Your output must be ONLY the final prompt. Nothing else.

**Examples:**
Original: A girl with red clothes and yellow hair standing in a park
Modification: change to black hair
Output: A girl with red clothes and black hair standing in a park

Original: A cyberpunk city at night with neon lights
Modification: add rain and reflections
Output: A cyberpunk city at night with neon lights, rain falling with reflections on wet streets

Original: 一只猫坐在窗边
Modification: 赛博朋克风格，背景是东京街头
Output: 一只赛博朋克风格的猫坐在东京街头的霓虹灯窗边`;

  const userPrompt = `Original: ${originalPrompt}
Modification: ${userModification}`;

  try {
    // 调用 LLM
    const response = await client.chat.completions.create({
      model: context.model.slug,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1, // 更保守，避免偏离
      max_tokens: 500
    });

    const mergedPrompt = response.choices?.[0]?.message?.content?.trim();
    
    if (!mergedPrompt) {
      throw new Error("Prompt 优化器未返回有效结果");
    }

    return mergedPrompt;
  } catch (error) {
    console.error("[PromptMerger] LLM 调用失败:", error);
    throw new Error(
      `Prompt 合并失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}

/**
 * 简单的 Prompt 合并策略（回退方案）
 * 当 LLM 不可用时，使用简单拼接
 */
export function mergePromptSimple(
  originalPrompt: string,
  userModification: string
): string {
  return `${originalPrompt}, ${userModification}`;
}
