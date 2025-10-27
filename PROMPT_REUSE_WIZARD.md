# 复用向导（Prompt Reuse Wizard）设计文档 v1

本文档定义“复用向导”的目标、流程、技术方案与里程碑。该功能支持基于示例提示词（prompt）进行二次创作，并按需呈现微调分类。采用“规则优先 + 轻量LLM兜底”的混合实现，优先低成本与可维护性。

## 1. 目标与非目标
- 目标
  - 用户点击“复用”后，通过弹窗向导收集二次创作意图（如性别/年龄/风格/广告元素/镜头等），自动改写并直接带入对话式生图。
  - 按需显示微调分类：仅当提示词中出现相关元素（如广告、场景、镜头）时显示对应控件；纯文本性提示则不显示。
  - 低延迟、低成本，优先规则解析；在不确定时使用便宜模型（例如 Gemini 2.5 Flash）做结构化补全。
  - 保留“锁定块”（如LoRA/ControlNet/构图/尺寸/负面词/种子等），进行差分改写，降低“走样”。
- 非目标
  - 不做重型提示工程平台；不在本阶段支持复杂跨模型语法迁移（仅做最小必要适配）。

## 2. 用户体验（UX）流程
1) 用户在资产/示例卡片点击“复用”。
2) 跳转至对话式生图页面并自动弹出“复用向导”。
3) 向导布局：
   - 左侧：示例图缩略图 + 原提示词的折叠展示（默认仅显示部分）。
   - 右侧：动态微调面板（按需显示）与通用参数区（比例、尺寸、负面词、改写强度等）。
4) 用户输入二次创作信息并确认“生成”。
5) 向导关闭；将“改写后的提示词 + 参数快照 + diff”作为会话首条消息发送并开始生成。
6) 会话中保留“来源示例ID/原提示词/用户输入”的溯源信息，便于再次复用和回滚。

## 3. 按需显示策略（核心）
- 规则层（优先）：
  - 以“词典 + 正则/模板”从原提示词中识别类别线索（多语言同义词支持）。
  - 对每个类别计算置信度；置信度≥阈值的类别才渲染对应UI控件。
- LLM兜底层（可选）：
  - 触发条件（任意满足）：
    - 规则命中类别 < 2；或
    - 提示词长度 ≥ 200 字/词；或
    - 出现复杂语法标记（如 lora:, controlnet:, ng:, seed:, ar:）；或
    - 规则层低置信度类别较多（≥3 个）。
  - 使用便宜模型（例如 Gemini 2.5 Flash）输出严格 JSON 的结构化结果；与规则结果合并，并为每类打置信度。
- 回退与手动纠正：
  - 若LLM超时/失败，回退规则结果；界面提供“显示全部控件”和“我来手动选类”。

## 4. 类别定义与识别要点（初版）
- 广告（advertising）
  - 线索：广告/海报/KV/banner/电商主图/促销/slogan/CTA/品牌/Logo/packshot/campaign 等
  - 槽位：品牌、产品、文案slogan、投放位（海报/KV/banner）
- 场景（scene）
  - 线索：室内/户外/街头/森林/沙滩/办公室/工作室/日落/夜景 等
  - 槽位：环境、时间、地点/风土
- 镜头/摄影（camera）
  - 线索：35mm/85mm/f1.8/DOF/bokeh/超广角/长焦/光圈/ISO/快门/三分法/俯拍/仰拍 等
  - 槽位：镜头/焦段、光圈、机位/构图
- 人物主体（subject）
  - 线索：male/female/男人/女人/男/女/years old/年龄/portrait/半身/全身 等
  - 槽位：性别、年龄、数量、姿态/视线
- 风格（style）
  - 线索：电影感/赛博朋克/写实/巴洛克/水彩/赛璐璐/像素风/胶片/纪实 等
  - 槽位：艺术流派、情绪/氛围
- 负面词（negative）
  - 线索：negative prompt/ng:/worst quality/blurry/lowres 等
  - 槽位：负面词列表
- 尺寸/比例（size）
  - 线索：1024x1024/16:9/1:1/ar 3:2 等
  - 槽位：宽/高/纵横比
- 种子（seed）
  - 线索：seed/seed:1234 等
  - 槽位：seed 值
- 后期/修图（post）
  - 线索：color grading/HDR/胶片颗粒/LUT/锐化 等
  - 槽位：分级/颗粒/其他后期参数

注：同义词表与正则需支持中英，允许按产品运营需要持续扩充。

## 5. 结构化输出 Schema

```json path=null start=null
{
  "lang": "zh|en",
  "categories": {
    "advertising": {
      "present": true,
      "confidence": 0.92,
      "slots": { "brand": "", "product": "", "slogan": "", "placement": "KV|banner|poster" }
    },
    "scene": {
      "present": true,
      "confidence": 0.85,
      "slots": { "env": "studio|outdoor|urban", "time": "golden hour|night", "location": "" }
    },
    "camera": {
      "present": false,
      "confidence": 0.4,
      "slots": { "lens": "", "aperture": "", "composition": "" }
    },
    "subject": {
      "present": true,
      "confidence": 0.88,
      "slots": { "gender": "male|female|other", "age": 30, "count": 1, "pose": "" }
    },
    "style": {
      "present": true,
      "confidence": 0.8,
      "slots": { "artStyles": ["cinematic"], "mood": "moody" }
    },
    "negative": { "present": true, "confidence": 0.9, "slots": { "terms": ["blurry", "lowres"] } },
    "size": { "present": true, "confidence": 0.95, "slots": { "width": 1024, "height": 1536, "aspectRatio": "2:3" } },
    "seed": { "present": false, "confidence": 0.2, "slots": { "seed": null } },
    "post": { "present": false, "confidence": 0.3, "slots": { "grading": "", "grain": "" } }
  },
  "normalizedPrompt": "(可选)结构化后合成的一段基线提示词",
  "uncertainty": ["如果存在冲突或不确定项，用简短中文/英文记录"]
}
```

UI 只渲染 present=true 且 confidence≥阈值（如 0.6）的分类，并允许“显示全部控件”。

## 6. 差分改写与锁定块
- 锁定块：LoRA/ControlNet 标签、构图/镜头、尺寸/比例、负面词、种子等默认保留。
- 用户槽位覆盖：用户输入优先覆盖可变槽位（如性别/年龄/风格/场景等）。
- 改写强度：
  - 严格（preserve-heavy）：尽量保持原语义，仅在指定位点替换；
  - 均衡（balanced）：允许词汇层面润色；
  - 创意（creative）：允许风格性改写但保留锁定块与关键约束。
- 输出：改写后的提示词 + 参数对象（尺寸/比例/seed/负面词等）。

## 7. LLM 调用策略（可选，成本可控）
- 模型：Gemini 2.5 Flash（或同级便宜模型），temperature=0，期望严格 JSON 输出。
- 触发：见第3节触发条件；最多 1 次/复用。
- 超时：≤ 1.2s；超时即回退规则结果。
- 去敏：仅传文本，不传图片或用户隐私；可截断至 1,500 字符。
- 缓存：以 prompt 哈希作为键，缓存 24h；命中直接用缓存。

示例系统提示词（简化）
```text path=null start=null
你是提示词结构化助手。请仅输出严格 JSON，符合给定 schema。不得输出多余文本。
目标：识别广告、场景、镜头、人物、风格、负面词、尺寸、种子、后期等是否存在，并提取槽位。
语言：保留用户语言，但字段值尽量标准化（如 16:9、85mm、f1.8）。
```

示例 few-shot（片段，注意仅展示思想，不必逐字使用）
```json path=null start=null
{"input":"cinematic portrait of a 30yo male, 85mm, shallow DOF, 4K poster","output":{ "categories":{"advertising":{"present":true,"confidence":0.7,"slots":{"placement":"poster"}},"camera":{"present":true,"confidence":0.95,"slots":{"lens":"85mm","aperture":"f1.8"}},"subject":{"present":true,"confidence":0.95,"slots":{"gender":"male","age":30}}}}}
```

## 8. 规则层实现要点
- 词典：每类一个同义词列表 + 关键正则（支持中英/常见缩写）。
- 评分：强匹配=1.0；同义词=0.8；弱线索=0.5；冲突时取最高并记录 uncertainty。
- 解析：
  - 尺寸/比例：匹配 WxH、ar x:y；
  - 种子：seed(=|:)?(\d+)；
  - 负面词：ng: 或 negative prompt: 之后的逗号/换行分隔；
  - 镜头：\b(\d{2,3}mm)\b、f\d(\.\d)?、(wide angle|telephoto|macro)；
  - 人物：male|female|\d+\s?(yo|years old)|男|女|人物/人像 等。

## 9. UI 映射（按需显示）
- advertising → 品牌/产品/投放位/slogan 输入框
- scene → 环境/时间/地点 选择/自动完成
- camera → 焦段/光圈/构图 下拉与输入
- subject → 性别/年龄/数量/姿态 控件
- style → 风格标签选择 + 氛围
- negative → 负面词编辑器（chips）
- size → 宽高或比例单选（锁定比例时禁用宽高）
- seed → 数字输入（可锁定）
- post → 分级/颗粒 开关与参数
- 通用：改写强度、保留构图/种子/比例 开关；“显示全部控件”切换；实时预览改写片段。

## 10. 参数映射与生成
- 合成顺序建议：
  1) 锁定块（LoRA/ControlNet/比例/seed/负面词）
  2) 主体与场景（主体→场景→风格）
  3) 摄影参数（镜头/光圈/构图/光照）
  4) 广告文案/品牌元素（如需）
- 产物：
  - finalPrompt（字符串）
  - genParams（JSON）：{ width, height, aspectRatio, seed, negative:[], … }
  - diff（字符串或结构）：展示与原提示的关键差异

## 11. 性能、成本与可观测性
- 缓存：分析结果与改写结果分别缓存（键=prompt 哈希 + 版本号）。
- 日志：记录触发路径（规则/LLM）、耗时、token 估算（如适用）、置信度分布。
- 监控：收集“用户改动后再次生成率”“回退显示全部比例”“LLM 触发率与超时率”。

## 12. 隐私与合规
- 不上传图片给LLM；仅传文本，且截断/脱敏（移除明显PII）。
- 遵循内容审查策略（如广告中涉及商标/品牌时仅作为描述，不自动生成真实Logo）。

## 13. 渐进式落地（里程碑）
- P0（2-3 天）：
  - 规则层解析 + 动态UI渲染 + 向导流程打通（不接LLM）
  - 差分改写（严格/均衡模式）+ 基本锁定块
- P1（3-5 天）：
  - 引入 LLM 兜底（Gemini 2.5 Flash），JSON 严格约束 + 缓存 + 超时回退
  - 多语言归一（术语标准化）
- P2（3-5 天）：
  - 分类与词典扩充；人群短选（性别/年龄）快捷项
  - UI 预览的片段高亮 + diff 展示
- P3（2-4 天）：
  - 可观测性完善、A/B（规则仅 vs 混合）
  - 质量评测集与回归测试（50-100 个提示词样本）

## 14. 接口草案（以实际代码为准）
- POST /api/prompt/analyze
  - 入参：{ prompt: string, lang?: 'zh'|'en' }
  - 出参：Schema 第5节 JSON
- POST /api/prompt/rewrite
  - 入参：{ basePrompt, userEdits, locks, strength }
  - 出参：{ finalPrompt, genParams, diff }
- 客户端：向导组件 <PromptReuseWizard /> 接收示例ID/提示词，内部调用 analyze → 渲染 → rewrite → 发起生成

## 15. 风险与对策
- 误判/漏判：阈值+“显示全部”开关；LLM 仅在低置信时触发；人工纠正后可写回词典。
- 走样：默认严格模式 + 锁定块保底，支持用户取消锁定。
- 多模型语法差异：加最小兼容层（比例/负面词/seed 的映射），超出范围不自动转换。
- 时延与成本：规则优先；LLM 超时回退；缓存命中率目标≥70%。

## 16. 验收标准（DoD）
- 在 50 条混合（中文/英文/长/短/含摄影参数/含广告语）样本上：
  - 分类召回率≥0.85（P1后）；
  - 误渲染控件率≤0.1；
  - 从点击“生成”到发出首条消息的 P95 延迟≤2s（规则路径≤800ms）。
- 用户可一键“显示全部控件”并成功生成。
- 改写强度三档均可用，且原始锁定块默认得到保留。

—— 以上为 v1 设计，可在实现中根据真实数据与反馈迭代细化。
