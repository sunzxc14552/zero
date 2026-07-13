# Cloudflare Worker 部署指南（海外用户）

> **国内用户请改用 [proxy/README.md](../proxy/README.md) 部署腾讯云云函数。**  
> `*.workers.dev` 在国内经常 `ERR_CONNECTION_TIMED_OUT`。

GitHub Pages 是静态网站，搜索必须通过代理。按下面步骤操作一次即可。

## 第一步：注册 Cloudflare

打开 https://dash.cloudflare.com/sign-up 免费注册

## 第二步：创建 Worker

1. 登录后，左侧点 **Workers & Pages**
2. 点 **Create** → 选 **Worker**
3. 名称填 `zhisou-search`（或任意名称）
4. 点 **Deploy** 先部署默认代码

## 第三步：替换 Worker 代码

1. 进入刚创建的 Worker，点 **Edit code**
2. **删除**编辑器里所有默认代码
3. **复制粘贴** 本目录 `search-proxy.js` 的全部内容
4. 点右上角 **Deploy**

## 第四步：设置 API Key

1. Worker 页面点 **Settings** → **Variables**
2. 在 **Environment Variables** 点 **Add**
3. 填写：

| 名称 | 值 | 类型 |
|------|-----|------|
| `SEARCH_API_KEY` | 你的博查 API Key | **Encrypt**（加密） |

4. 点 **Save and deploy**

博查 API Key 获取：https://open.bochaai.com/api-keys

## 第五步：复制 Worker 地址

在 Worker 详情页顶部找到 **Visit** 或 **Preview** 旁的公网地址，类似：

```
https://bold-base-16cb.sunzxc14552.workers.dev
```

**注意：**
- 必须复制 `*.workers.dev` 结尾的地址
- **不要**复制浏览器地址栏里 `dash.cloudflare.com/...` 的控制台链接
- 不要加末尾斜杠

## 第六步：配置 GitHub Secret

1. 打开 https://github.com/sunzxc14552/zero/settings/secrets/actions
2. 点 **New repository secret**
3. 填写：

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://zhisou-search.sunzxc14552.workers.dev` |

4. 点 **Add secret**

## 第七步：重新部署网站

在 GitHub 仓库 **Actions** 标签：

1. 点左侧 **Deploy to GitHub Pages**
2. 点右侧 **Run workflow** → **Run workflow**

等 1-2 分钟部署完成后，访问 https://sunzxc14552.github.io/zero/ 测试搜索。

## 验证 Worker 是否正常

浏览器打开（把地址换成你的）：

```
https://zhisou-search.sunzxc14552.workers.dev/api/search?q=测试&cat=all
```

若返回 JSON 搜索结果，说明 Worker 配置成功。
