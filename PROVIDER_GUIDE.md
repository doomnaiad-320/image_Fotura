# AI Provider 配置指南

## Provider Slug 命名规则

在管理后台创建或编辑 Provider 时，`slug` 字段必须遵循以下规则：

### ✅ 格式要求

- **长度**：2-40 个字符
- **字符类型**：只允许小写字母（`a-z`）、数字（`0-9`）、连字符（`-`）
- **正则表达式**：`^[a-z0-9-]+$`

### ✅ 有效示例

```
openai
gpt-4
claude-3
anthropic
openrouter
together-ai
deepseek-v2
qwen-max
gemini-pro
llama-3
```

### ❌ 无效示例

```
OpenAI          # ❌ 包含大写字母
GPT-4           # ❌ 包含大写字母
gpt_4           # ❌ 包含下划线（应使用连字符）
claude 3        # ❌ 包含空格
anthropic.com   # ❌ 包含点号
```

## 常见错误及解决方案

### 错误 1：包含大写字母

**错误信息**：
```
只允许小写字母、数字和连字符，例如: openai, gpt-4, claude-3
```

**解决方案**：
```
错误：OpenAI
正确：openai

错误：Claude-3
正确：claude-3

错误：GPT4Turbo
正确：gpt-4-turbo
```

### 错误 2：使用下划线或特殊字符

**错误信息**：
```
只允许小写字母、数字和连字符
```

**解决方案**：
```
错误：gpt_4
正确：gpt-4

错误：claude@anthropic
正确：claude-anthropic

错误：model.v2
正确：model-v2
```

### 错误 3：包含空格

**解决方案**：
```
错误：claude 3
正确：claude-3

错误：gpt 4 turbo
正确：gpt-4-turbo
```

## Provider 完整配置示例

### OpenAI
```json
{
  "slug": "openai",
  "name": "OpenAI",
  "baseURL": "https://api.openai.com/v1",
  "apiKey": "sk-proj-...",
  "enabled": true
}
```

### Anthropic (Claude)
```json
{
  "slug": "anthropic",
  "name": "Anthropic",
  "baseURL": "https://api.anthropic.com/v1",
  "apiKey": "sk-ant-...",
  "enabled": true
}
```

### DeepSeek
```json
{
  "slug": "deepseek",
  "name": "DeepSeek",
  "baseURL": "https://api.deepseek.com/v1",
  "apiKey": "sk-...",
  "enabled": true
}
```

### Azure OpenAI
```json
{
  "slug": "azure-openai",
  "name": "Azure OpenAI",
  "baseURL": "https://your-resource.openai.azure.com",
  "apiKey": "your-api-key",
  "enabled": true
}
```

### Ollama (本地部署)
```json
{
  "slug": "ollama",
  "name": "Ollama Local",
  "baseURL": "http://localhost:11434",
  "apiKey": "",
  "enabled": true
}
```

### Together AI
```json
{
  "slug": "together-ai",
  "name": "Together AI",
  "baseURL": "https://api.together.xyz/v1",
  "apiKey": "...",
  "enabled": true
}
```

## 最佳实践

### 1. Slug 命名建议

- **简短明了**：使用提供商的常见简称
- **与品牌一致**：尽量使用官方的小写名称
- **版本标识**：如有多个版本，使用连字符分隔，如 `gpt-4`, `claude-3`

### 2. 推荐命名模式

| Provider | 推荐 Slug | 说明 |
|----------|-----------|------|
| OpenAI | `openai` | 官方名称小写 |
| Claude | `anthropic` 或 `claude` | 可用公司名或产品名 |
| GPT-4 | `gpt-4` | 模型名带版本 |
| DeepSeek V2 | `deepseek-v2` | 版本号用连字符连接 |
| Azure OpenAI | `azure-openai` | 多词用连字符连接 |
| 本地 Ollama | `ollama` 或 `ollama-local` | 可加位置说明 |

### 3. 避免冲突

- 确保每个 slug 在系统中唯一
- 不同环境的相同提供商可以加后缀，如：
  - `openai-prod`
  - `openai-dev`
  - `openai-test`

## 技术说明

### 为什么有这些限制？

1. **URL 安全**：slug 会用于 API 路径，如 `/api/providers/{slug}`
2. **数据库索引**：slug 作为唯一键，需要简单一致的格式
3. **跨平台兼容**：避免大小写敏感问题（Windows vs Linux）
4. **易于维护**：统一的命名规范便于管理

### 验证逻辑位置

- **前端验证**：`components/admin/ai-console.tsx`
- **后端验证**：`lib/ai/providers.ts` (providerInputSchema)
- 两处验证保持一致，确保数据质量

## 常见问题 (FAQ)

**Q: 我能修改已有 Provider 的 slug 吗？**

A: 不能。Slug 创建后无法修改（编辑时为禁用状态）。如需更改，请删除旧的 Provider 并创建新的。

**Q: 删除 Provider 会影响已有的模型吗？**

A: 会。删除 Provider 会级联删除所有关联的模型。请谨慎操作。

**Q: 为什么不允许大写字母？**

A: 为了保证跨平台一致性和 URL 友好性。不同操作系统对大小写的处理不同，统一使用小写可以避免潜在问题。

**Q: 我输入了中文，但是报错了怎么办？**

A: Slug 不支持中文或其他非 ASCII 字符。请使用拼音或英文，如：
- 通义千问 → `qwen`
- 文心一言 → `ernie` 或 `wenxin`
- 智谱清言 → `zhipu` 或 `glm`

## 相关文档

- [WARP.md](./WARP.md) - 项目开发文档
- [DATABASE_SEEDING.md](./DATABASE_SEEDING.md) - 数据库初始化指南
- [API 文档](./API.md) - API 接口说明（如存在）

## 技术支持

遇到问题？
1. 检查浏览器控制台的详细错误信息
2. 确认 slug 符合命名规则
3. 查看 Provider 管理界面的实时提示
4. 参考本文档的示例
