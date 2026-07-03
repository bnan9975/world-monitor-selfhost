# 全球态势感知 · 自托管免费部署指南（Vercel + Upstash）

本仓库已经完成 **Pro 全解锁**（合法自托管，AGPL "modify-and-run"，零白嫖），并通过生产构建验证。
本文是把它免费、24 小时在线跑起来的完整步骤。

---

## 0. 解锁现状（已改好，无需你再动代码）

服务端网关只认一个环境变量即放行全部 Pro 路由；客户端已打 3 处补丁让 web 版显示并请求 Pro 面板。

| 位置 | 改动 | 作用 |
|---|---|---|
| `src/config/self-host.ts`（新增） | `SELF_HOST_PRO_UNLOCK` / `SELF_HOST_WM_KEY` 开关 | 集中开关，默认解锁 |
| `src/services/panel-gating.ts` | `hasPremiumAccess()` 首行 `return true` | 前端所有 Pro 面板按"已解锁"渲染 |
| `src/config/panels.ts` | `isPanelEntitled()` 首行 `return true` | 允许启用/添加 Pro 面板 |
| `src/services/premium-fetch.ts` | 附加 `X-WorldMonitor-Key: VITE_WM_KEY` | web 端请求带上 enterprise key |

> 还原原版付费墙：构建时设 `VITE_WM_LOCK_PRO=1` 即可。

本次生成的 enterprise 密钥（客户端 `VITE_WM_KEY` 与服务端 `WORLDMONITOR_VALID_KEYS` 必须相同）：

```
wm_528c9b6adbc03d6e6fb2fd2330c309f48dc98e7d
```

> 该 key 会明文出现在客户端 JS 中——对个人自托管无所谓（它只解锁你自己实例上你自己的算力，配合限流即可）。想要更私密就自己重新生成一把：`node -e "console.log('wm_'+require('crypto').randomBytes(20).toString('hex'))"`，两处同步替换。

---

## 1. 建 Upstash Redis（免费）

绝大多数数据面板从 Redis 读缓存，所以 Redis 是"出数据"的关键（站点没它也能启动，但很多面板空）。

1. 打开 <https://upstash.com> → 用 GitHub/Google 登录（免费，无需信用卡）。
2. **Create Database** → 选一个离你近的区域（如 `ap-northeast-1` 东京）→ 免费 tier。
3. 进数据库详情页 → **REST API** 区块，复制两个值：
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## 2. 部署到 Vercel（二选一）

### 方案 A（推荐）：GitHub → Vercel

好处：git push 自动重新部署；天然适合放定时喂数据的 GitHub Actions。

1. 在 GitHub 新建一个**私有**仓库（如 `world-monitor-selfhost`），先别放任何文件。
2. 本地把当前目录推上去：
   ```bash
   cd "D:/claude/股票分析00/全球态势感知"
   git remote set-url origin https://github.com/<你的用户名>/world-monitor-selfhost.git
   git add -A && git commit -m "self-host: unlock pro + deploy config"
   git push -u origin main
   ```
3. 打开 <https://vercel.com> → GitHub 登录 → **Add New → Project** → 导入该仓库。
4. **Build & Development Settings** 覆盖为：
   - Framework Preset: **Vite**（或 Other）
   - Install Command: `npm ci --ignore-scripts`
   - Build Command: `vite build`
   - Output Directory: `dist`
5. 填 **Environment Variables**（见第 3 节）→ **Deploy**。

### 方案 B（最快，无需 GitHub）：Vercel CLI

```bash
cd "D:/claude/股票分析00/全球态势感知"
npx vercel login          # 邮箱或 GitHub 登录（会给一个验证链接/码）
npx vercel link           # 新建/关联项目
# 逐个加环境变量（见第 3 节），例如：
npx vercel env add WORLDMONITOR_VALID_KEYS production
npx vercel env add VITE_WM_KEY production
npx vercel env add UPSTASH_REDIS_REST_URL production
npx vercel env add UPSTASH_REDIS_REST_TOKEN production
# 部署（覆盖构建命令）：
npx vercel deploy --prod --build-env VITE_WM_KEY=wm_528c9b6adbc03d6e6fb2fd2330c309f48dc98e7d
```
> 用 CLI 时在 Vercel 项目设置里同样把 Build Command 设为 `vite build`、Install Command 设为 `npm ci --ignore-scripts`、Output 设为 `dist`。

---

## 3. Vercel 环境变量

| 变量 | 值 | 必需? | 说明 |
|---|---|---|---|
| `WORLDMONITOR_VALID_KEYS` | `wm_528c9b6adbc03d6e6fb2fd2330c309f48dc98e7d` | ✅ | 服务端解锁（enterprise key）|
| `VITE_WM_KEY` | 同上 | ✅ | 客户端带 key（**构建时**读取，必须在 Deploy 前就设好）|
| `UPSTASH_REDIS_REST_URL` | 第 1 步复制 | ✅(出数据) | 缓存/种子数据 |
| `UPSTASH_REDIS_REST_TOKEN` | 第 1 步复制 | ✅(出数据) | 同上 |
| `GROQ_API_KEY` | <https://console.groq.com> 免费 | 可选 | AI 洞察 / 局势推演 / 简报（LLM，免费 14.4k 次/天）|
| `FINNHUB_API_KEY` | <https://finnhub.io> 免费 | 可选 | 实时股票报价 |
| `FRED_API_KEY` / `EIA_API_KEY` / `NASA_FIRMS_API_KEY` | 各官网免费 | 可选 | 宏观 / 能源 / 火点（主要给 seeder 用）|

**不要设** `VITE_CONVEX_URL`、`VITE_CLERK_PUBLISHABLE_KEY`——留空即干净关闭多用户登录/计费，走单租户自托管。

---

## 4. 喂数据（可选，让供应链/韧性/贸易等面板出数）

新闻、摄像头、市场、地图、CII 等大多数面板在请求时实时抓取，**开箱即用**。
但供应链成本冲击、韧性评分、贸易流量等面板是"纯读缓存"，需要定时跑 seeder 把数据写进你的 Upstash。

已附带 `.github/workflows/seed-upstash.yml`（走方案 A 时自动可用）：
1. GitHub 仓库 → **Settings → Secrets and variables → Actions** 添加：
   `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`（可选 `GROQ_API_KEY`、`FRED_API_KEY` 等）。
2. 工作流每小时自动跑一批 seeder；也可在 **Actions** 页手动 **Run workflow**。

---

## 5. 注意事项 / 已知取舍

- **国内访问**：Vercel 默认 `*.vercel.app` 域名在国内偶尔慢/不稳。要稳定 24h 访问建议**绑自己的域名**（Vercel 免费支持 + 免费 HTTPS），或用 Cloudflare Pages（见 README 备选）。
- **Yahoo Finance**：股票分析走 `query1.finance.yahoo.com`。Vercel 海外节点可达，出真数据；你本地国内直连会超时（这也是本地看到 `available:false` 的原因，不是解锁问题）。
- **LLM 相关面板**：`局势推演(deduct-situation)` 无 LLM 时返回空（无规则兜底）；`股票分析` 有规则引擎兜底，**没 LLM 也出真数据**。配一把免费 Groq key 即可点亮 AI 面板。
- **实时中继面板**（AIS 船只 / OpenSky 飞机 / Telegram）需要长驻 WebSocket 中继，不适合 Vercel，留空即自动禁用，与 Pro 解锁无关。
- **AGPL 合规**：若把站点公开，需按 AGPL 提供你修改后的源码（把上面这个仓库设为公开即可满足）。
