# 两阶段发版

正式 tag 只准备前端，不下载引擎、不更新升级入口。后端正式发布后，由维护者手动运行 **Finalize Release**，选择已准备好的前端构建和明确的引擎版本。安装包继续内置引擎，支持离线安装。

常规操作按当天发版设计：周五前端就绪后推送 tag，几小时内后端发布完成，再手动运行一次收尾。下述恢复机制用于网络故障或任务失败，不增加正常发版的按钮、输入项或等待阶段。

## 操作步骤

1. 按原有方式推送正式 tag。`build-multi-prod.yml` 准备 Yakit CE/EE，IRify、Memfit 的原有 tag 入口分别准备对应发行版。
2. 等待 Prepare 工作流成功。Summary 会给出 **Prepare run ID**。也可在 Actions 手动运行 **Prepare Release**，选择发行版和软件版本，提前验证分支。
3. 后端引擎发布完成后，打开 Actions → **Finalize Release**，填写 Prepare run ID 和完整引擎版本，例如 `1.4.9-beta5`。
4. 首次验证保持 `publish` 未勾选：生成并签名全部安装包，将结果放入候选草稿，不触碰正式 Release、OSS 安装包目录或升级入口。确认后再运行一次，勾选 `publish` 完成正式发版。
5. 常规发版验证成熟后，可以直接勾选 `publish`，一次人工触发完成引擎下载、签名、安装包生成和发布。

分支构建只允许预演。正式发布要求候选来自成功的本仓库 Prepare 工作流、来源为正式 tag，且 tag 仍指向原提交。已公开的软件版本不能被新的手动执行覆盖。正式收尾开始时，以原子创建的草稿资产绑定该软件版本、前端候选、引擎版本和唯一的收尾 run ID；上传和汇总时再次核对所有权。同一候选和引擎也不能由另一个正式任务接管，防止多个部分失败的任务交错重跑后混用已重新签名的安装包。

正式 tag 与发行版必须匹配：`v<版本>` 只允许 Yakit CE/EE，`v<版本>-irify` 只允许 IRify CE/EE，`v<版本>-memfit` 只允许 Memfit；渲染端 tag、无 `v` 前缀以及跨产品组合均不能用于正式候选。Finalize 会再次校验已保存的候选，旧的错误候选也会被拒绝。发布阶段使用与预检相同的工作流源码版本执行保护检查；只有安装包封装阶段检出候选提交，旧候选不会替换新的升级入口保护逻辑。

Finalize 与 **Publish OSS Version Tag** 共用升级入口发布锁。在锁内先读取全部目标 OSS 频道，再校验和写入；低于当前频道的版本会失败。只有明确的 404 表示频道尚未创建，网络故障、权限错误或非法版本内容均会中止。GitHub latest 单独比较版本：较旧的其他产品仍可正常公开 Release，但不会取代全仓库的 latest。此保护适用于包含新脚本的工作流；历史 tag 中的旧工作流及人工 OSS 写入不受该锁保护，请勿与新版发布并行操作。常规入口不提供降级开关。

正式上传前和最终发布锁内都会重新读取软件 Release 状态，防止 `Re-run failed jobs` 复用旧预检结果后覆盖已发布版本。上传步骤也使用工作流当前版本的保护脚本，与候选提交分开检出。开始更新升级入口前，原子创建 `release-state.json`，记录收尾 run ID、引擎版本与完整发布清单哈希，并冻结安装包；发布完成后另外创建 `release-complete.json`。两个标记均不覆盖已有资产，完成标记上传失败也不会丢失原有封存状态。仅 EE 发布保持私有草稿，同样受此状态保护。入口和平台上传均拒绝已封存版本；部分升级入口更新或完成标记上传失败时，只允许原任务重跑失败的最终发布 job，并要求清单哈希保持一致。新任务不能接管已经开始的发布。

正式任务失败后，在原来的 Finalize 运行中选择 **Re-run failed jobs**，已成功的前端构建和平台结果继续复用。计划会以 `finalize-plan-<收尾 run ID>.json` 不可变地保存到候选 Draft；封装与汇总直接恢复该计划，校验候选、软件源码、目标矩阵、引擎、发布模式及原任务所有权，不依赖一天后过期的 Actions 交接产物。收尾 run ID 由 CI 自动处理，维护者不用增加输入。

如果 GitHub Release 已经公开，但完成标记上传失败，原发布 job 可以校验所有权、封存清单哈希和公开清单的实际哈希后，仅补写缺失的完成标记。安装包、公开清单、OSS 升级入口和 GitHub latest 都不会被重写；已有且正确的完成标记按幂等成功处理。候选草稿仍须保留，原工作流也须在 GitHub 允许的重跑期限内。

## 提前完成的工作

- 在 Linux 标准 runner 上构建主渲染端、Link 和生产 Electron 主进程，冻结 Chrome 扩展资源。
- 按 Windows x64、Linux x64/arm64、macOS Intel/Apple Silicon 并行预装配，分别使用 Electron 27.0.0 和兼容版 22.3.27。
- 完成生产依赖筛选、`app.asar`、Electron 外壳、图标、平台标记和应用版本等准备。
- 全部目标成功后才写入候选的 `candidate.json` 就绪标记。构建结束后释放 runner，不等待后端。

未签名的 macOS 预装配统一使用 Apple Silicon runner，按目标架构下载对应 Electron，包括 Intel x64。收尾与 PR 安装包测试仍使用各自的原生 runner；Intel 引擎启动、应用签名和安装包封装继续在 Intel Mac 执行。

收尾下载指定版本的引擎并校验官方 SHA256。社区版优先 slim，只在该产物确实返回 404 时退回 full；网络错误或哈希不符直接失败。收尾保留主渲染端和 Electron `app.asar` 的原始哈希，不重新编译前端、不切换依赖版本。

macOS 在注入引擎后签名应用，普通版按现有策略公证，兼容版保留原有不公证策略。签名遇到 Apple 时间戳服务暂不可用时最多尝试 3 次；票据校验遇到 Apple 网络断连时只重试该查询，最多 3 次。证书、签名或无效票据错误不重试。Windows 在本平台封装任务中完成安装包签名。保留原有文件名和 EE Linux legacy `.run` 安装包。

每个平台完成真实引擎启动、认证和握手验证后，直接将自身安装包上传到 OSS 版本目录；公开发行版同时上传到尚未公开的 GitHub Release。只有所有目标的签名、校验和上传均成功，才更新 OSS 升级版本指针和公开 GitHub Release。

## 免费 Actions 与产物保存

只使用公共仓库免费的标准 GitHub-hosted runners，不依赖自托管或付费大规格 runner。整体并发上限设为 20，macOS 的实际并发由 GitHub 账户配额调度。

Prepare 阶段小体积的工作流交接产物保存 1 天；完整的预装配应用和每次 Finalize 的不可变计划保存到 `ci-release-<Prepare run ID>` **Draft Release**，避免长期占用 Actions artifact 配额。Finalize 不再依赖会过期的 `finalize-plan` Actions artifact。tar/gzip 封装保留 macOS framework 软链接与文件执行权限。该草稿用于仓库构建交接，**不要手动公开**。

候选草稿保留用于预演、重试和排查。确认不再需要后，可由维护者删除对应的 `ci-release-*` 草稿；不要删除正在准备或收尾的候选。删除后，该 run ID 不再能用于发版。

构建与打包工具分开缓存。渲染构建保留完整开发依赖；原生预装配和收尾仅安装根生产依赖与固定版本的 Electron、electron-builder、esbuild、公证工具，省去测试框架和 TypeScript 等依赖。依赖版本从根清单读取，使用现有 `yarn.lock` 的 frozen 安装，不修改根清单或锁文件。

两个渲染端缓存已安装的 `node_modules`，命中后不重复执行依赖安装。缓存按系统、架构、Node 版本、依赖声明及锁文件内容区分，软件版本号变化不使依赖缓存失效。Electron ZIP 按系统、目标架构、精确版本单独缓存；安装器工具在收尾阶段单独缓存。主进程只构建一次，预装配直接移动应用目录，避免复制完整 Electron 外壳。

**Warm Release Caches** 在主分支依赖或缓存配置变更后自动执行，并于每周一、四北京时间 05:30 刷新。它只准备依赖和 Electron，不构建应用、不下载引擎、不创建候选、不触发发布。默认分支缓存可被新正式 tag 读取；不同 tag 之间不能直接共享缓存，因此不能用某个旧 tag 的热缓存代替主分支预热。合并后可从 Actions 手动执行一次预热；缓存失效时仍自动按锁文件安装。

主渲染端生产构建使用 Vite 8 的 Oxc JS 压缩器，CSS 保留现有 esbuild 压缩及顺序配置。预装配和收尾仍执行产物哈希、真实引擎、签名与公证检查。GitHub 排队、冷缓存和 Apple 服务延迟会影响总耗时，缓存命中不代表工作流没有等待时间。

## 分支验证

`release-pipeline-test.yml` 在相关 PR 上执行发布契约测试、Electron 类型检查和既有构建测试，并针对上述五个平台的普通版/兼容版生成实际安装包。使用固定的已发布引擎 `1.4.9-beta5`，不创建候选草稿、不上传 OSS、不更新升级入口。同仓库 PR 使用现有 secrets 验证 Apple 签名/公证和 Windows 签名；fork PR 只验证未签名封装。

Windows Azure 和 Apple 签名/公证、OSS 真实写入需要仓库 secrets。正式版本和升级入口只在人工运行 Finalize Release 且勾选 publish 时写入。现有 secrets 名称保持不变。普通预演只保存候选草稿；下述分支测试入口还会验证隔离目录中的真实 OSS 写入。所有 OSS 上传均使用 PutObject 的 Content-MD5，并通过 HEAD 核对远端 ETag。

### 在未合并分支上验证完整交接

GitHub 的手动入口需要默认分支上已有对应工作流文件。PR 合并前，可借助现有入口在同一测试分支执行两次独立任务：

测速前可先手动运行 **Verify Yakit Sign and Notarize Build**，选择测试分支并勾选 `warm_release_cache`。这次任务仅调用缓存预热，其余签名与收尾任务跳过。分支预热缓存仅供该分支及允许访问的 PR 使用；正式 tag 依赖合并后在默认分支执行的预热。完整矩阵测试与预装配测速分开运行，避免同时占用 macOS 配额。

1. 手动运行 **Prepare Yakit Release**（文件 `build-multi-prod.yml`），选择测试分支，发行版选择 `yakit,yakitEE`，软件版本可填写 `1.4.9-ci.4461`。此阶段只预装配，不下载引擎；全部完成后，从 Summary 复制 Prepare run ID。
2. 手动运行 **Verify Yakit Sign and Notarize Build**，选择同一分支，填写该 Prepare run ID 和明确的已发布引擎版本。留空 run ID 时仍执行原有 macOS 签名检查。
3. 新任务调用同一 Finalize Release，强制 `publish=false`，在新 runner 上下载候选、校验归档并还原，然后注入引擎、签名、封装。
4. 签名安装包保存在候选 Draft Release，并实际上传至 `yak/ci-release-tests/<收尾 run ID>/`、`vip/ci-release-tests/<收尾 run ID>/`。每次上传后通过 HEAD 校验远端 ETag 与本地 Content-MD5 一致；只有全部目标上传和校验成功，完整 `release-manifest.json` 才记录预演成功。

这个专用分支测试入口不会创建正式软件 Release，不会写入正式版本目录或 `latest`，不会切换升级入口。普通 Finalize 预演仍只上传候选草稿；额外的 OSS 测试开关仅在可复用工作流调用时提供，并拒绝正式 tag 候选或 `publish=true`。

参考：[GitHub 标准 runner](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)、[Actions 并发限制](https://docs.github.com/en/actions/reference/limits)、[Release 存储](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)、[electron-builder 生命周期](https://www.electron.build/docs/configuration/)、[OSS 请求签名](https://help.aliyun.com/en/oss/developer-reference/include-signatures-in-the-authorization-header)。
