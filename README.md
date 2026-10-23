# AI智能伴侣 · Web-Pages

基于 DeepSeek API 的 AI 聊天伴侣（原 Streamlit 版的纯前端实现），部署于 GitHub Pages，托管域名 [tanghong.xin](https://tanghong.xin)。

## ✨ 功能

- 🤖 仿 Streamlit 简约 UI：标题置于侧边栏顶部，主体区域留给聊天
- 🎭 侧边栏自定义伴侣「昵称」与「性格」，System Prompt 动态拼接
- 💬 流式逐字输出（SSE），Markdown 渲染（代码块 / 加粗 / 链接等）
- 💾 聊天记录 localStorage 持久化，刷新不丢失
- 🔑 API Key 存于 Cloudflare Worker 的 Secret 环境变量中，前端源码不含任何 key，用户无需填写
- 🛡️ 自建 Cloudflare Worker 代理（`api.tanghong.xin`），负责注入 Key、CORS 白名单与流式透传
- 🧠 对话轮次上限 20 轮（上下文与本地记录均只保留最近 20 轮）
- ⚙️ 右上角 Settings：About / 主题切换（System · Light · Black）/ Report a Bug
- 🎨 三套主题基于 CSS 变量实现，选择结果持久化，System 模式自动跟随系统深浅色
- 🐞 「Report a Bug」弹窗 → mailto 邮件反馈

## 📁 项目结构

```
.
├── index.html       # 页面结构（HTML）
├── css/
│   └── style.css    # 全部样式 + 主题变量（浅色 / Black）
├── js/
│   ├── theme.js     # 主题引导（head 中同步加载，防深色闪白）
│   └── app.js       # 主逻辑（聊天 / API 流式 / 渲染 / 设置面板 / 邮件反馈）
└── README.md
```

## 🚀 本地运行

无需构建，直接静态托管即可：

```bash
# 任意静态服务器，例如：
python -m http.server 8080
# 打开 http://localhost:8080
```

## 🌐 部署（GitHub Pages）

1. 推送本仓库到 GitHub（main 分支）
2. 仓库 → Settings → Pages → Source 选 `Deploy from a branch` → `main` / `/ (root)`
3. 绑定自定义域名：Settings → Pages → Custom domain（仓库根目录 CNAME 文件已配置）

## ⚙️ 配置

- 模型：`deepseek-v4-flash`（`js/app.js` 中 `MODEL` 常量）
- API Key：存于 Cloudflare Worker 的 Secret（`DEEPSEEK_API_KEY`），前端不含 key
- 对话轮次上限：`js/app.js` 中 `MAX_ROUNDS` 常量（默认 20）
- API 地址：`https://api.tanghong.xin/chat/completions`（自建 Cloudflare Worker 代理）
- Bug 反馈邮箱：`js/app.js` 中 `BUG_EMAIL` 常量

## ☁️ Cloudflare Worker 代理

前端不直接连接 DeepSeek，而是经过自建 Worker（`cloudflare-worker/` 目录）：

```
浏览器 → https://api.tanghong.xin → Cloudflare Worker → api.deepseek.com
```

- Key 只存在 Worker 的 Secret 环境变量里，公开的源码/仓库中永远看不到
- Worker 内置 CORS 白名单（仅 `tanghong.xin` / `www.tanghong.xin` / 本地调试地址可调用）
- 流式 SSE 原样透传，前端体验不变
