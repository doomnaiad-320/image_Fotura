# 🖤 高端黑白金配色系统使用指南

## 设计理念

**关键词**：权威感 · 极简黑白 · 高端金融 · 机构信任感

整体风格以**黑、白、金、棕**为主色调，营造稳健、专业、可信赖的高端氛围。

---

## 🎨 配色体系

### Dark 主题（推荐）

| 元素 | 颜色值 | 用途 |
|------|--------|------|
| 主背景 | `#000000` | 纯黑背景，极致高端 |
| 卡片背景 | `#111111` | 深灰卡片/模块 |
| 文字主色 | `#FAFAFA` | 接近纯白，高对比 |
| 辅助文字 | `#A6A6A6` | 次要信息 |
| 边框 | `#262626` | 细线分隔 |
| 古铜金 | `#C49A6C` | 强调色、按钮、链接 |
| 古铜金-深 | `#B9825E` | 悬停态 |

### Light 主题（可选）

| 元素 | 颜色值 | 用途 |
|------|--------|------|
| 主背景 | `#FCFCFC` | 接近纯白 |
| 辅助背景 | `#F9F9F9` | 模块切换对比 |
| 文字主色 | `#1A1A1A` | 深黑文字 |
| 辅助文字 | `#666666` | 次要信息 |
| 边框 | `#EBEBEB` | 浅灰边框 |
| 古铜金 | `#C49A6C` | 保持一致 |

---

## 🔤 字体系统

### 字体家族

```css
/* 标题（衬线字体 - 权威感） */
font-family: "Playfair Display", Georgia, "Times New Roman", serif;

/* 正文（无衬线 - 现代易读） */
font-family: "Inter", "Helvetica Neue", ui-sans-serif, system-ui;
```

### Tailwind 类名

```tsx
{/* 标题使用衬线 */}
<h1 className="font-serif text-5xl md:text-6xl mb-6">
  高端金融平台
</h1>

{/* 正文使用无衬线 */}
<p className="font-sans leading-relaxed">
  这是一段正文内容
</p>
```

### 排版特点

- **标题字距**：`letter-spacing: 0.02em`（tracking-wider）
- **正文行距**：`line-height: 1.8`（leading-relaxed）
- **段落间距**：`mb-4`（16px）
- **大留白**：模块间距 `py-16 md:py-24`

---

## 🎯 组件示例

### 1. 极简按钮

```tsx
{/* 黑底白字按钮（Dark 主题） */}
<button className="btn-minimal-dark">
  立即体验
</button>

{/* 白底黑字按钮（Light 主题） */}
<button className="btn-minimal-light">
  了解更多
</button>

{/* 古铜金按钮（强调操作） */}
<button className="btn-gold">
  开始创作
</button>
```

预定义样式：
- `btn-minimal`：基础样式（px-6 py-3 border-2）
- `btn-minimal-dark`：黑底白字 + 悬停反转
- `btn-minimal-light`：白底黑字 + 悬停反转
- `btn-gold`：古铜金背景

### 2. 带金色下划线的标题

```tsx
<h2 className="gold-underline font-serif text-4xl mb-8">
  我们的服务
</h2>
```

效果：标题下方出现 60px 宽的古铜金渐变下划线。

### 3. 大留白区块

```tsx
<section className="section-spacious bg-black text-white">
  <div className="max-w-4xl mx-auto">
    <h2 className="font-serif text-4xl mb-6">区块标题</h2>
    <p className="leading-relaxed text-muted-foreground">
      这是一个大留白模块，呼吸感强。
    </p>
  </div>
</section>
```

### 4. 卡片组件

```tsx
<div className="bg-card border border-default rounded-md p-8">
  <h3 className="font-serif text-2xl mb-4">卡片标题</h3>
  <p className="text-muted-foreground leading-relaxed">
    卡片内容，保持高行距和留白。
  </p>
  <a href="#" className="text-gold hover:text-gold-dark transition-colors">
    了解更多 →
  </a>
</div>
```

### 5. 导航栏

```tsx
<nav className="bg-black border-b border-default">
  <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
    <div className="font-serif text-2xl text-gold">AIGC Studio</div>
    <div className="flex gap-8">
      <a href="#" className="text-white hover:text-gold transition-colors">
        首页
      </a>
      <a href="#" className="text-white hover:text-gold transition-colors">
        探索
      </a>
      <button className="btn-gold">登录</button>
    </div>
  </div>
</nav>
```

---

## 🛠️ Tailwind 工具类速查

### 颜色类

```tsx
{/* 古铜金文字 */}
<span className="text-gold">强调文字</span>

{/* 古铜金背景 */}
<div className="bg-gold">金色背景</div>

{/* 古铜金边框 */}
<div className="border border-gold">金色边框</div>

{/* 悬停效果 */}
<a className="text-gold hover:text-gold-dark">链接</a>

{/* 黑白对比 */}
<div className="bg-black text-white">纯黑背景</div>
```

### 字体类

```tsx
{/* 衬线字体 */}
<h1 className="font-serif">标题</h1>

{/* 无衬线字体 */}
<p className="font-sans">正文</p>

{/* 字距调整 */}
<h2 className="tracking-wider">较宽字距</h2>

{/* 行高调整 */}
<p className="leading-relaxed">1.8 倍行高</p>
<p className="leading-loose">2.0 倍行高</p>
```

### 布局类

```tsx
{/* 大留白区块 */}
<section className="section-spacious">内容</section>

{/* 等效于 */}
<section className="py-16 md:py-24 px-6 md:px-12">内容</section>
```

---

## 📐 设计原则

### 1. 极简主义
- 减少不必要的装饰
- 大量留白营造呼吸感
- 细线边框而非粗重阴影

### 2. 黑白对比
- 纯黑（#000000）vs 纯白（#FFFFFF）
- 高对比度提升可读性
- 古铜金作为唯一强调色

### 3. 权威感塑造
- 标题使用衬线字体（Playfair Display）
- 大字号 + 大字距
- 中英文混排时保持对齐

### 4. 留白艺术
- 模块间距：`py-16 md:py-24`（64-96px）
- 行高：1.8-2.0（正文）
- 段落间距：`mb-4`（16px）

### 5. 过渡动画
- 所有交互元素添加 `transition`
- 时长：`duration-300`（0.3s）
- 缓动函数：`ease`

---

## 🌐 Google Fonts 引入

在 `app/layout.tsx` 中引入字体：

```tsx
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

然后在 `globals.css` 中使用：

```css
body {
  font-family: var(--font-inter), "Helvetica Neue", sans-serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-playfair), Georgia, serif;
}
```

---

## 🎨 实战案例

### 首页 Hero 区

```tsx
<section className="section-spacious bg-black text-white">
  <div className="max-w-5xl mx-auto text-center">
    <h1 className="gold-underline font-serif text-6xl mb-8">
      重新定义 AI 创作
    </h1>
    <p className="text-xl leading-loose text-muted-foreground mb-12 max-w-2xl mx-auto">
      专业级多模型平台，为企业和创作者提供稳健可靠的 AIGC 解决方案
    </p>
    <div className="flex gap-6 justify-center">
      <button className="btn-gold">
        开始创作
      </button>
      <button className="btn-minimal-dark">
        了解更多
      </button>
    </div>
  </div>
</section>
```

### 特性展示

```tsx
<section className="section-spacious bg-white">
  <div className="max-w-6xl mx-auto">
    <h2 className="gold-underline font-serif text-4xl mb-16 text-center">
      核心优势
    </h2>
    <div className="grid md:grid-cols-3 gap-12">
      {features.map((feature) => (
        <div key={feature.id} className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gold rounded-full flex items-center justify-center">
            <feature.icon className="text-black text-2xl" />
          </div>
          <h3 className="font-serif text-2xl mb-4">{feature.title}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
```

---

## ✅ 检查清单

开发时确保：

- [ ] 标题使用 `font-serif`
- [ ] 正文行高 ≥ 1.8（`leading-relaxed`）
- [ ] 模块间距充足（`section-spacious`）
- [ ] 链接悬停使用古铜金（`hover:text-gold-dark`）
- [ ] 按钮有过渡动画（`transition-all duration-300`）
- [ ] 黑色背景配白色文字（高对比）
- [ ] 避免使用彩色，只用黑白金
- [ ] 边框细线化（`border-default` / `border-gold`）

---

## 🎭 主题切换

默认使用 Dark 主题，切换方式：

```tsx
// 通过 data-theme 属性切换
<html data-theme="dark">  {/* 或 "light" */}
  <body>...</body>
</html>
```

---

## 参考资料

- **字体**：[Playfair Display](https://fonts.google.com/specimen/Playfair+Display) · [Inter](https://fonts.google.com/specimen/Inter)
- **灵感来源**：高端金融机构网站（投行、私募、奢侈品牌）
- **配色工具**：[Coolors](https://coolors.co/) · [Adobe Color](https://color.adobe.com/)

---

**💡 提示**：这套配色系统专为需要「信任感」和「权威感」的场景设计，适合金融、法律、咨询、奢侈品等行业。
