# 国内搜索代理部署指南（推荐）

GitHub Pages 是静态网站，搜索需要后端代理。`*.workers.dev` 在国内经常无法访问，推荐使用 **腾讯云云函数**。

## 架构

```
GitHub Pages（前端）  →  腾讯云云函数（API 代理）  →  博查 API
```

---

## 方案一：腾讯云云函数（推荐，免费额度够用）

### 第一步：注册腾讯云

打开 https://cloud.tencent.com/ 注册并完成实名认证。

### 第二步：创建云函数

1. 控制台搜索 **云函数 SCF**，进入控制台
2. 左侧 **函数服务** → **新建**
3. 配置：
   - 函数名称：`zhisou-search`
   - 运行环境：**Node.js 18.15**（或更高）
   - 创建方式：**空白函数**
4. 点 **完成**

### 第三步：粘贴代码

1. 进入函数 → **函数代码**
2. 删除默认代码
3. 复制粘贴 `proxy/tencent-scf/index.js` 的全部内容
4. 点 **部署**

### 第四步：配置环境变量

1. **函数配置** → **环境变量** → **编辑**
2. 添加：

| Key | Value |
|-----|-------|
| `SEARCH_API_KEY` | 你的博查 API Key |

3. 保存

博查 API Key 获取：https://open.bochaai.com/api-keys

### 第五步：创建 API 网关触发器

1. **触发管理** → **创建触发器**
2. 选择 **API 网关**
3. 配置：
   - API 服务：新建 API 服务
   - 请求方法：**GET**
   - 发布环境：**发布**
   - 路径：`/api/search`
   - 启用 CORS：**是**
4. 提交

### 第六步：复制访问地址

创建成功后，触发器会显示访问路径，类似：

```
https://service-xxxxx-xxxxxxxx.gz.apigw.tencentcs.com/release/api/search
```

取 **域名 + 环境路径** 作为 `VITE_API_URL`（去掉 `/api/search`）：

```
https://service-xxxxx-xxxxxxxx.gz.apigw.tencentcs.com/release
```

### 第七步：验证代理

浏览器打开（换成你的地址）：

```
https://service-xxxxx-xxxxxxxx.gz.apigw.tencentcs.com/release/api/search?q=测试&cat=all
```

返回 JSON 搜索结果即成功。

### 第八步：配置 GitHub Secret

1. 打开 https://github.com/sunzxc14552/zero/settings/secrets/actions
2. 编辑或新建 `VITE_API_URL`
3. Value 填第六步的地址（**不要**末尾斜杠）

### 第九步：重新部署网站

GitHub 仓库 → **Actions** → **Deploy to GitHub Pages** → **Run workflow**

---

## 方案二：轻量服务器 / VPS

如果你有一台国内服务器（腾讯云轻量、阿里云 ECS 等）：

```bash
# 在服务器上
export SEARCH_API_KEY=你的博查APIKey
node proxy/server.mjs
```

默认监听 `8787` 端口。用 Nginx 反代到 HTTPS 后，将域名填入 `VITE_API_URL`。

生产环境建议用 pm2 守护：

```bash
npm install -g pm2
SEARCH_API_KEY=你的key pm2 start proxy/server.mjs --name zhisou-proxy
```

---

## 常见问题

### `ERR_CONNECTION_TIMED_OUT`

说明当前网络访问不了代理地址。若用的是 `workers.dev`，请改用本指南的腾讯云方案。

### 返回 `未配置 SEARCH_API_KEY`

在云函数 **环境变量** 中添加 `SEARCH_API_KEY` 并重新部署。

### API Key 无效

到 https://open.bochaai.com/api-keys 重新创建密钥，更新云函数环境变量。
