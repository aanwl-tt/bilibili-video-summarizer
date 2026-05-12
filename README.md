# Bilibili Video Summarizer

Bilibili 视频摘要 Chrome 扩展 — 从视频字幕生成 AI 结构化笔记。

## 功能

- 自动抓取 Bilibili 视频字幕（支持 WBI 签名）
- 多 LLM 支持：Claude、OpenAI、DeepSeek、Ollama、OpenAI 兼容 API
- 结构化输出：章节（标题、时间戳、摘要、关键要点）、整体总结、标签
- 侧边栏 UI，点击时间戳跳转视频对应位置

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8

### 安装与构建

```bash
# 克隆项目
git clone https://github.com/aanwl-tt/bilibili-video-summarizer.git
cd bilibili-video-summarizer

# 安装依赖
cd extension
pnpm install

# 构建
pnpm build
```

### 加载扩展

1. 打开浏览器扩展管理页面：
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展」，选择 `extension/dist` 文件夹

### 使用

1. 打开任意 Bilibili 视频页面
2. 点击视频下方的「📝 总结」按钮
3. 首次使用需在侧边栏设置中填写 LLM API Key
4. 等待 30-60 秒，查看结构化笔记

## 项目结构

```
extension/
├── manifest.json            # Chrome 扩展配置
├── src/
│   ├── background/          # Service Worker
│   ├── content/             # Content Script（注入 B 站页面）
│   ├── popup/               # 弹出窗口
│   ├── services/            # 核心逻辑
│   │   ├── llm.ts           # 多 LLM Provider 调用
│   │   ├── subtitle.ts      # 字幕抓取
│   │   ├── summarizer.ts    # 摘要编排
│   │   ├── wbi.ts           # B 站 WBI 签名
│   │   └── prompt.ts        # 提示词模板
│   ├── shared/              # 共享类型和常量
│   └── sidepanel/           # 侧边栏 UI（React）
└── vite.config.ts
```

## License

MIT
