# AI智能伴侣 · Web-Pages

基于 DeepSeek API 的 AI 聊天伴侣（原 Streamlit 版的纯前端实现），部署于 GitHub Pages，托管域名 [tanghong.xin](https://tanghong.xin)。

## ✨ 功能

- 🤖 仿 Streamlit 简约 UI，标题「AI智能伴侣」
- 🎭 侧边栏自定义伴侣「昵称」与「性格」，System Prompt 动态拼接
- 💬 流式逐字输出（SSE），Markdown 渲染（代码块 / 加粗 / 链接等）
- 💾 聊天记录 localStorage 持久化，刷新不丢失
- 🔑 API Key 由用户自行输入，仅存于本地浏览器
- 🐞 「Report a Bug」弹窗 → mailto 邮件反馈

## 📁 项目结构

```
.
├── index.html       # 页面结构（HTML）
├── css/
│   └── style.css    # 全部样式（仿 Streamlit 风格）
├── js/
│   └── app.js       # 全部逻辑（聊天 / API 流式 / 渲染 / 邮件反馈）
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
- API 地址：`https://api.deepseek.com/chat/completions`（浏览器跨域直连）
- Bug 反馈邮箱：`js/app.js` 中 `BUG_EMAIL` 常量
