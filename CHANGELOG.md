# Changelog

All notable changes to AIGC Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **二次编辑功能**：支持对生成的图片进行迭代优化
  - "作为输入"按钮：一键将生成结果加载到编辑器
  - Prompt 继承机制：自动填充原始提示词，显示"已继承"徽章
  - 链式编辑：支持多次迭代编辑，保留完整编辑历史
  - 对比视图：结果/对比/滑块三种模式查看编辑前后效果
  - 移动端优化：触摸友好的滑块对比和 Mask 涂选

### Changed
- **历史面板增强**：添加收藏功能,支持按 Prompt 搜索和按模型筛选
- **Prompt 输入优化**：新增清空按钮，支持快速重置输入
- **响应式布局**：优化移动端显示，画笔大小适配小屏幕操作

### Fixed
- 修复 HistoryPanel 中 onToggleFavorite 未正确传递的问题
- 修复"作为输入"时可能出现的跨域和缓存问题（通过代理 API）

---

## [1.0.0] - 2025-01-14

### Added
- 初始版本发布
- AI 文生图/文生文工作台
- Credits 计费系统
- Provider/模型管理后台
- 用户认证系统（NextAuth v4）
- 瀑布流首页和探索页
- 移动端支持（Capacitor）

### Technical
- 基于 Next.js 14 (App Router) 构建
- Prisma ORM + SQLite/Postgres 数据库
- OpenAI SDK 兼容多种 AI Provider
- Tailwind CSS 响应式设计
- Vitest + Playwright 测试覆盖

---

[Unreleased]: https://github.com/yourorg/aigc-studio/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourorg/aigc-studio/releases/tag/v1.0.0
