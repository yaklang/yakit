# 两阶段发版

正式 tag 只准备前端，不下载引擎、不更新升级入口。后端正式发布后，由维护者手动运行 **Finalize Release**，选择已准备好的前端构建和明确的引擎版本。安装包继续内置引擎，支持离线安装。

## 操作步骤

1. 按原有方式推送正式 tag。`build-multi-prod.yml` 准备 Yakit CE/EE，IRify、Memfit 的原有 tag 入口分别准备对应发行版。
2. 等待 Prepare 工作流成功。Summary 会给出 **Prepare run ID**。也可在 Actions 手动运行 **Prepare Release**，选择发行版和软件版本，提前验证分支。
3. 后端引擎发布完成后，打开 Actions → **Finalize Release**，填写 Prepare run ID 和完整引擎版本，例如 `1.4.9-beta5`。
4. 首次验证保持 `publish` 未勾选：生成并签名全部安装包，将结果放入候选草稿，不触碰正式 Release、OSS 安装包目录或升级入口。确认后再运行一次，勾选 `publish` 完成正式发版。
5. 常规发版验证成熟后，可以直接勾选 `publish`，一次人工触发完成引擎下载、签名、安装包生成和发布。

分支构建只允许预演。正式发布要求候选来自成功的本仓库 Prepare 工作流、来源为正式 tag，且 tag 仍指向原提交。已公开的软件版本不能被新的手动执行覆盖。正式收尾开始时，以原子创建的草稿资产绑定该软件版本、前端候选和引擎版本，防止不同候选同时覆盖同一版本目录。

## 提前完成的工作

- 在 Linux 标准 runner 上构建主渲染端、Link 和生产 Electron 主进程，冻结 Chrome 扩展资源。
- 按 Windows x64、Linux x64/arm64、macOS Intel/Apple Silicon 并行预装配，分别使用 Electron 27.0.0 和兼容版 22.3.27。
- 完成生产依赖筛选、`app.asar`、Electron 外壳、图标、平台标记和应用版本等准备。
- 全部目标成功后才写入候选的 `candidate.json` 就绪标记。构建结束后释放 runner，不等待后端。

收尾下载指定版本的引擎并校验官方 SHA256。社区版优先 slim，只在该产物确实返回 404 时退回 full；网络错误或哈希不符直接失败。收尾保留主渲染端和 Electron `app.asar` 的原始哈希，不重新编译前端、不切换依赖版本。

macOS 在注入引擎后签名应用，普通版按现有策略公证，兼容版保留原有不公证策略。Windows 在本平台封装任务中完成安装包签名。保留原有文件名和 EE Linux legacy `.run` 安装包。

每个平台完成真实引擎启动、认证和握手验证后，直接将自身安装包上传到 OSS 版本目录；公开发行版同时上传到尚未公开的 GitHub Release。只有所有目标的签名、校验和上传均成功，才更新 OSS 升级版本指针和公开 GitHub Release。

## 免费 Actions 与产物保存

只使用公共仓库免费的标准 GitHub-hosted runners，不依赖自托管或付费大规格 runner。整体并发上限设为 20，macOS 的实际并发由 GitHub 账户配额调度。

小体积的工作流交接产物保存 1 天；完整的预装配应用保存到 `ci-release-<Prepare run ID>` **Draft Release**，避免长期占用 Actions artifact 配额。tar/gzip 封装保留 macOS framework 软链接与文件执行权限。该草稿用于仓库构建交接，**不要手动公开**。

候选草稿保留用于预演、重试和排查。确认不再需要后，可由维护者删除对应的 `ci-release-*` 草稿；不要删除正在准备或收尾的候选。删除后，该 run ID 不再能用于发版。

工具链按平台、架构和根 `yarn.lock` 缓存。缓存缺失时以 frozen lockfile 安装；普通版和兼容版通过 electron-builder 的 `electronVersion` 选择运行时，发版期间不修改 package.json 中的依赖或 yarn.lock。

## 分支验证

`release-pipeline-test.yml` 在相关 PR 上执行发布契约测试、Electron 类型检查和既有构建测试，并针对上述五个平台的普通版/兼容版生成实际安装包。使用固定的已发布引擎 `1.4.9-beta5`，不创建候选草稿、不上传 OSS、不更新升级入口。同仓库 PR 使用现有 secrets 验证 Apple 签名/公证和 Windows 签名；fork PR 只验证未签名封装。

Windows Azure 和 Apple 签名/公证、OSS 真实写入需要仓库 secrets。OSS 写入只在人工运行 Finalize Release 且勾选 publish 时执行。现有 secrets 名称保持不变。预演不会验证真实 OSS 写入；正式上传使用 OSS PutObject 的 Content-MD5 校验和现有 OSS 凭据。

参考：[GitHub 标准 runner](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)、[Actions 并发限制](https://docs.github.com/en/actions/reference/limits)、[Release 存储](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)、[electron-builder 生命周期](https://www.electron.build/docs/configuration/)、[OSS 请求签名](https://help.aliyun.com/en/oss/developer-reference/include-signatures-in-the-authorization-header)。
