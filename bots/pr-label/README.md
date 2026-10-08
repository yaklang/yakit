# pr-label：PR 被打上 `ready` 或 `need more test` → 飞书群机器人

脚本在 `bots/pr-label/pr-label.mjs`，由 `.github/workflows/pr-label-notify.yml` 在
`pull_request` 的 `labeled` 事件里调用。GitHub 把完整事件写进 `GITHUB_EVENT_PATH`，
脚本直接读这个文件，**不调 GitHub API**，不需要 PAT，也不需要轮询。

## 触发条件（默认）

workflow 只在**目标分支是 `master`** 的 PR 上监听 `labeled` 事件。合进其它分支的 PR 不会启动。
不是每个标签都发消息。只有本次被打上的标签名**完全等于** `ready` 或 `need more test` 时才推送（大小写不敏感，不考虑前后缀）：

| 被打上的标签 | 结果 |
| --- | --- |
| `ready` | ✅ 推送 |
| `need more test` | ✅ 推送 |
| `READY` / `Need More Test` | ✅ 推送 |
| `ready-to-merge` / `ready-for-review` | ❌ 跳过 |
| `need more testing` | ❌ 跳过 |
| `needs-review` / `blocked` / 其它 | ❌ 跳过 |

判定发生在**发消息之前**，被跳过的标签不会消耗任何请求。要多通知一个标签，在
`pr-label.mjs` 的 `WATCH_LABELS` 里加一项。

---

## 消息长什么样

示例来自 `fixtures/labeled-ready.json`：

```
┌──────────────────────────────────────────────────────────┐
│ 请值班人员审阅并合并                                     │  <- ready 的标题
├──────────────────────────────────────────────────────────┤
│ 【测试】feat: 支持通过飞书 webhook 推送 PR 标签变更       │  <- 内容第一行 = PR title
│ 作者：nonight                                            │
│ 分支：feat/pr-label-feishu → main                        │
│ Labels：ready                                            │  <- 绿色 text_tag
│ ──────────────────────────────────────────────────────── │
│ 触发时间 2026/10/07 02:06                                │
│ [打开 PR]  [复制 PR 链接]                                │  <- footer，只能 open_url
└──────────────────────────────────────────────────────────┘
```

三段结构与代码里的对应关系：

| 位置 | 内容 | 来源 |
| --- | --- | --- |
| 标题 | `ready`：请值班人员审阅并合并；`need more test`：请产品进行测试。其它标签用 PR title。没有副标题 | 本次打上的标签 |
| 内容 | 第一行是 PR title，接着是作者、分支、本次标签 | `pull_request.title` / `user.login` / `base.ref`+`head.ref` / `label.name` |
| 按钮 | 「打开 PR」和「复制 PR 链接」放在同一行。schema 2.0 的按钮只能 `open_url`，没有复制到剪贴板的交互 | `html_url` |
| footer | 触发时间（默认 Asia/Shanghai，24 小时制；可用 `PR_LABEL_TZ` 覆盖）。schema 2.0 不支持 `note`，用小字 markdown | `text_size: notation` |

Labels 只展示这次被打上的那一个标签，用 `<text_tag color='green'>ready</text_tag>` 渲染成彩色 tag。没有标签时显示「无」。
标题栏和正文 tag 只分三种颜色：`ready` 绿、`need more test` 橙，其它标签蓝。

设 `PR_LABEL_MSG_TYPE=text` 会降级成纯文本，字段顺序相同：

```
请值班人员审阅并合并
【测试】feat: 支持通过飞书 webhook 推送 PR 标签变更
作者：nonight
分支：feat/pr-label-feishu → main
PR：https://github.com/yaklang/yakit/pull/128
Labels：ready
触发时间：2026/10/07 02:06
```

---

## 一、目录里都是啥

| 文件 | 说明 |
| --- | --- |
| `pr-label.mjs` | 机器人本体。单文件、零第三方依赖，只用 Node 18+ 内置的 `fetch` / `crypto` |
| `package.json` | 本地脚本：`send` / `send:test`（真发送）/ `skip`（标签不匹配，不发送）/ `dry` / `dry:test` / `dry:skip` / `probe` / `test`。不需要 `npm install` |
| `.env.example` | 本地调试用的变量清单。脚本**不会**自动读 `.env`，要自己导出 |
| `fixtures/labeled-ready.json` | 示例事件，只有一个标签 `ready`，会推送。卡片标题由代码生成，不写在这个文件里 |
| `fixtures/labeled-need-more-test.json` | 示例事件，只有一个标签 `need more test`，会推送。卡片标题由代码生成 |
| `fixtures/labeled.json` | 示例事件，只有一个标签 `needs-review`，会跳过 |
| `test/smoke.mjs` | 75 条冒烟用例，用本地 mock 飞书，不打真实 webhook |

仓库里的 workflow 不在这个目录，而在 `.github/workflows/pr-label-notify.yml`。
它 `checkout` 之后执行 `node bots/pr-label/pr-label.mjs`。

---

## 二、workflow 怎么接到脚本

`.github/workflows/pr-label-notify.yml` 已经放在本仓库：

- `pull_request` 的 `labeled`，且 PR 目标分支是 `master`：读 `GITHUB_EVENT_PATH`，命中白名单才发飞书。

`on: pull_request: types: [labeled]` 就是 GitHub 投递给 Actions 的事件，
**不需要公网 webhook 地址**。只有不在 Actions 上跑、改成自建服务时，才要到
Settings → Webhooks 配 outbound URL。

脚本零依赖，workflow 里不需要安装这个包。Node 版本要求 `>=18`，workflow 使用 22。

---

## 三、把飞书那条 URL 配成 secret

飞书只给你一条 URL，形如：

```
https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 方式 A：网页（推荐）

目标仓库 → **Settings → Secrets and variables → Actions → Secrets → New repository secret**

| Name | 必填 | 值 |
| --- | --- | --- |
| `PR_LABEL_WEBHOOK_URL` | **是** | 上面那条完整 URL |

只填这一个就能跑。可选再配一个：

| Name | 什么时候需要 |
| --- | --- |
| `PR_LABEL_SECRET` | 机器人「安全设置」里开了**签名校验** |

Variables（同一页面的 Variables 标签）可选：

| Name | 默认 | 说明 |
| --- | --- | --- |
| `PR_LABEL_MATCH_MODE` | `exact` | `exact`（完全相等，默认）/ `contains`（包含即命中）/ `all`（任何标签都通知）。比较时忽略大小写。标签名单本身不在这里配 |
| `PR_LABEL_MSG_TYPE` | `interactive` | 填 `text` 降级为纯文本 |
| `PR_LABEL_KEYWORD` | 空 | 安全设置开了**关键词**才需要，会拼到文本或卡片标题前 |

脚本还会读这些环境变量（workflow 未传入时用默认值）：

| Name | 默认 | 说明 |
| --- | --- | --- |
| `PR_LABEL_TIMEOUT_MS` | `10000` | 单次请求超时 |
| `PR_LABEL_RETRIES` | `3` | 只在飞书明确返回限流时重试。超时或断线不重试，避免群里出现重复卡片 |
| `PR_LABEL_TZ` | `Asia/Shanghai` | 卡片 footer 的时区 |

名字都带 `PR_LABEL_` 前缀，避免以后加别的机器人时变量撞名。`GITHUB_EVENT_PATH` 是 Actions 注入的，保持原名。

GitHub 出口 IP 不固定，飞书的 **IP 白名单在 CI 上不可行**，安全设置选签名或关键词。

没配 `PR_LABEL_WEBHOOK_URL` 时，workflow 的 guard 打 warning 后跳过，job 仍是绿色。

### 方式 B：gh CLI

```bash
# 直接塞（URL 会进 shell 历史）
gh secret set PR_LABEL_WEBHOOK_URL --body "https://open.feishu.cn/open-apis/bot/v2/hook/你的UUID"

# 或先写文件再读，避免 URL 留在命令历史里
printf '%s' "https://open.feishu.cn/open-apis/bot/v2/hook/你的UUID" > /tmp/hook.txt
gh secret set PR_LABEL_WEBHOOK_URL < /tmp/hook.txt && rm /tmp/hook.txt

gh secret set PR_LABEL_SECRET --body "你的签名密钥"              # 开了签名才需要
# 标签名单在 pr-label.mjs 的 WATCH_LABELS。想改成「任何标签都通知」才需要：
# gh variable set PR_LABEL_MATCH_MODE --body "all"
```

### 验证配对

webhook 配好后不再通过 Actions 单独测。本地只看连通性测试消息长什么样、不发送：

```bash
cd bots/pr-label
npm run probe
```

---

## 四、触发器的选择

workflow 默认 `pull_request`。但：

- **PR 来自 fork 时，`pull_request` 拿不到 secrets**。GitHub 的安全限制会导致发不出去。
  开源仓库接外部贡献时，把 `on.pull_request` 改成 `pull_request_target`，并同样限制 `branches: [master]`。
- `pull_request_target` 跑在**基础分支**上下文、token 有写权限，
  所以 workflow 显式收紧了 `permissions: contents: read`。本脚本只读事件、发消息。
- 两者的 `github.event` 结构一样，脚本不用改。

---

## 五、本地调试

在 `bots/pr-label` 下执行。脚本只读进程环境变量，不会加载 `.env`：

```bash
cd bots/pr-label
cp .env.example .env          # 填入真实 webhook URL；不要提交 .env
set -a && source .env && set +a

npm run send                  # labeled-ready.json（ready），配置了 webhook 就会发到飞书
npm run send:test             # labeled-need-more-test.json（need more test），配置了 webhook 就会发到飞书
npm run skip                  # labeled.json（needs-review），标签不匹配，不发送
npm run dry                   # 同一条 ready 事件，只打印卡片，不发送
npm run dry:test              # need more test，只打印卡片，不发送
npm run dry:skip              # needs-review，日志里会写跳过
npm run probe                 # 打印连通性测试消息，不发送
npm test                      # 75 条冒烟用例（本地 mock，不访问飞书）
```

不经过 npm，直接调脚本：

```bash
node pr-label.mjs --event-file=./fixtures/labeled-ready.json --dry-run
node pr-label.mjs --event-file=./fixtures/labeled-need-more-test.json --dry-run
node pr-label.mjs --event-file=./fixtures/labeled.json --dry-run
node pr-label.mjs --event-json='{"action":"labeled",...}'
cat ev.json | node pr-label.mjs --stdin
node pr-label.mjs --probe --dry-run
```

在 Actions 里不需要这些参数：脚本自动读 `GITHUB_EVENT_PATH`。
`--dry-run` 时日志里的 webhook 只保留 UUID 前 4 位。

常用参数：`--dry-run`、`--probe`、`--stdin`、`--event-file`、`--event-json`、
`--match-mode`、`--webhook-url`、`--secret`、`--keyword`、`--msg-type`。

---

## 六、收不到消息怎么排查

按概率从高到低：

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| Actions 是绿的，但群里没消息 | workflow 的 guard 发现没配 secret，打了 warning 就跳过了 | 看 job 日志里的 `::warning::`，补配 `PR_LABEL_WEBHOOK_URL` |
| Actions 是绿的，日志写「标签 xxx 不等于 [ready, need more test]」 | 打上的标签不在 `WATCH_LABELS` 里 | 把标签名加进 `pr-label.mjs` 的 `WATCH_LABELS`；想放行全部设 `PR_LABEL_MATCH_MODE=all` |
| job 根本没触发 | workflow 不在 `.github/workflows/` 下、事件类型不是 `labeled`，或 PR 不是合进 `master` | 检查 `pr-label-notify.yml` 的 `types: [labeled]` 和 `branches: [master]` |
| fork 的 PR 收不到，本仓库分支的 PR 收得到 | `pull_request` 拿不到 secrets | 换 `pull_request_target` |
| 日志含 `19021` | 签名不匹配，或时间戳超过 1 小时 | 核对 `PR_LABEL_SECRET`；本机时间偏差过大也会失败 |
| 日志含 `19024` | 未命中自定义关键词。关键词只校验标题和文本 | 配 `PR_LABEL_KEYWORD`，或关掉飞书侧的关键词校验 |
| 日志含 `19022` | 出口 IP 不在飞书白名单 | CI 出口 IP 不固定，不要用 IP 白名单 |
| 日志含 `9499` | 请求体格式错误或超过 20KB | 看飞书返回的 msg；超限在发送前就会被拦住 |
| probe 收得到、真实事件收不到 | URL 与签名没问题，问题在事件解析 | 查白名单与触发器类型 |
| 日志含 `11232` | 飞书限流（100 次/分、5 次/秒） | 脚本只对这个码重试；超时或断线不再重发，避免重复卡片 |

发送失败时脚本以退出码 1 结束，Actions 会标红。

想省 runner 分钟，可以在 workflow 的 `if:` 里提前拦掉不关心的标签：

```yaml
# 这行区分大小写。不写时由脚本做不区分大小写的精确匹配。
if: github.event.label.name == 'ready' || github.event.label.name == 'need more test'
```

---

## 附录：什么时候需要「跨仓库轮询版」

当前只保留事件触发版。只有在**被监听的仓库加不了 workflow** 时，
才需要退回到定时轮询。重建时注意：

- 定时调 `GET /repos/{owner}/{repo}/issues/events`。PR 的 labeled 事件也在这个接口里
  （PR 属于 issue），用 `issue.pull_request` 区分 PR 与 issue。
- 该接口**不支持 `since`**，只能翻页后自己按 `created_at` 截断。
- 跨仓库**必须用 PAT**。`GITHUB_TOKEN` 只对当前仓库生效，读别的仓库会 404 或 403。
- 去重游标不能只存时间戳。同一秒有多个事件时会漏发或重发，需要「时间戳 + 同秒已处理 id」。
- 延迟取决于轮询周期。15 分钟的 cron 最坏就是约 15 分钟。
