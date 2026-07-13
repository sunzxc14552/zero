# 智搜 — 联网自动搜索

支持 **GitHub Pages** 部署的联网搜索引擎。

## 部署架构

```
GitHub Pages（前端）  →  Cloudflare Worker（API 代理）  →  博查 API
```

博查 API 不支持浏览器跨域，因此生产环境需要通过 Cloudflare Worker 代理。

## 一、部署 Cloudflare Worker（免费）

### 1. 注册 [Cloudflare](https://dash.cloudflare.com/) 账号

### 2. 安装 Wrangler 并部署

```bash
npm install -g wrangler
cd worker
wrangler login
wrangler secret put SEARCH_API_KEY   # 填入博查 API Key
wrangler deploy
```

部署成功后会显示 Worker 地址，例如：
```
https://zhisou-search-proxy.你的用户名.workers.dev
```

## 二、部署 GitHub Pages

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "deploy: github pages"
git push
```

### 2. 配置 GitHub Secrets

仓库 **Settings → Secrets and variables → Actions**，添加：

| Name | Value |
|------|-------|
| `VITE_API_URL` | Worker 地址，如 `https://zhisou-search-proxy.xxx.workers.dev` |

### 3. 开启 GitHub Pages

**Settings → Pages → Source** 选择 **GitHub Actions**

### 4. 访问网站

仓库名为 `zero` 时，访问地址为：

```
https://sunzxc14552.github.io/zero/
```

> 项目站点 URL 格式：`https://用户名.github.io/仓库名/`
> 用户站点（仓库名 `用户名.github.io`）才是：`https://用户名.github.io/`

### 5. 若出现 404

1. 确认 **Settings → Pages → Source** 已选 **GitHub Actions**
2. 打开 **Actions** 标签，确认最新部署成功（绿色勾）
3. 推送本修复后等待 1-2 分钟再访问

## 本地开发

```bash
npm install
cp .env.example .env   # 填入 SEARCH_API_KEY
npm run dev
```

本地开发使用 Vite 代理，无需配置 Worker。

## 常见问题

### 字体加载失败
已移除 Google Fonts，改用系统字体，无需外网加载。

### 搜索 404 `/api/search`
请确保已配置 `VITE_API_URL` 并重新部署。GitHub Pages 本身没有后端 API。

### API Key 无效
在 Cloudflare Worker 中重新设置 Secret：
```bash
wrangler secret put SEARCH_API_KEY
```

## 技术栈

- React 19 + TypeScript + Vite 6
- GitHub Actions + GitHub Pages
- Cloudflare Workers
- 博查 Web Search API
