# GitHub 全平台打包

在 GitHub Actions 选择 **Multi-Platform Build Develop** → **Run workflow**。默认配置为：

- platform: `mwl`（全部平台）
- version: `memfit`（AI Senso）
- engine: 开启，内置本次流水线开始时确定的引擎版本
- legacy: 关闭，使用项目固定的 Electron 版本
- sign: 关闭；需要签名时开启并配置已有 Apple/Azure Secrets
- storage: `release`，安装包保存到 GitHub Release，避开 Actions 产物存储额度

一次触发会分别构建 Windows x64、Linux x64/arm64、macOS Intel x64/Apple arm64。每个任务都使用对应系统和架构的原生 GitHub Runner，独立安装依赖、编译、打包。不要在 Mac 上编译主进程字节码后交叉打包 Windows/Linux，也不要把 x64 字节码放进 arm64 包。

主进程字节码由仓库内的构建插件逐个编译，避免同时启动大量 Electron 进程。编译器只在子进程输出完整关闭、退出码正常且缓存有效时接受结果；失败会显示模块文件名和编译错误，空文件不能进入安装包。编译全部成功后才生成缓存和入口，入口保留模块导出及模块间依赖；两种 Linux 架构与 Windows、macOS 共用这一实现。

每个平台在正式构建前会验证输出读取时序、异常退出、空缓存和超时处理，并用该平台的 Electron 测试跨模块加载与大缓存输出。打包后继续执行完整缓存和应用启动检查。

主版本来自根目录 package.json 的 `version`，保留数字版本，例如 `1.4.8`；日期取流水线启动时的北京时间，生成 `1.4.8-MMDD`。日期只计算一次，所有任务使用相同值，包括跨午夜任务。无需每天手动改 package.json；如果要升级主版本，修改其数字部分。标签发布取标签中的数字版本，其旧日期也会替换为实际打包日期。同一天重复打包版本号相同，GitHub 产物按运行记录分开保存。

默认先创建本次运行专用的 Release 草稿，各平台将安装包和构建清单（含校验值）保存为 `native-平台-架构.zip`。全部目标通过后，汇总任务重新下载并核对清单与校验值，上传 `build-version.txt`，再发布为预发布版，不设置为 latest；任一目标失败则保留草稿。同一天重复打包使用不同运行标签，包内版本仍是同一天的日期。每个 ZIP 必须小于 2 GiB，解压后保留原始安装包文件名。

完成后从本仓库 **Releases** 下载对应 ZIP 并解压安装。可以单独选 Windows、Linux 或 macOS；`legacy` 使用 Electron 22.3.27，只表示兼容构建，仍需在实际旧系统上测试。`uos` 另外提供 .run 启动包。若选择 `storage: artifact`，则沿用 Actions 的 **desktop-packages-版本号** 汇总产物（保留 7 天），此方式仍受 Actions 产物存储额度限制。

上传前检查包内版本、每个主进程字节码是否被打包后的 Electron 接受，并实际启动应用，等待启动页面加载且继续存活五秒。所有目标通过后才能完成汇总校验和发布；标签发布也只上传通过这些检查的汇总包。启动检查不验证登录后的全部业务流程，也不能代替真实用户系统测试。

正式发布继续由 `v*-memfit` 标签触发 **Build Memfit Prod**，共用相同流程，并保留普通/兼容两组共十个包及已有签名、公证和 OSS 发布。OSS 目录使用实际包内版本 `/memfit/版本号/`，标签与实际版本的对应关系保存到 `/memfit/build-tags/标签/build-version.txt`。手动发布 latest 时读取这个记录，避免把旧标签日期作为新包版本。缺少已有签名或 OSS Secrets 时正式发布会报错，先用默认不签名的手动流水线测试。

Mac 的无证书测试包也会生成本地 ad-hoc 签名，确保修改 Electron fuses 后二进制仍有效；它不提供开发者身份认证或公证。正式签名模式继续使用 Developer ID、硬化运行时和公证，并要求签名成功。

Mac 检查会挂载最终 DMG、复制应用到独立临时安装目录、卸载 DMG，再验证完整签名、字节码和实际启动。正式签名模式还检查系统评估与公证票据。该流程覆盖拖拽安装，避免只启动构建目录的应用而漏掉签名问题。

自动升级开关未修改。汇总包仅包含安装包和构建清单；Windows 安装包签名完成后再计算校验值。

本地验证构建辅助逻辑：`node --test scripts/__test__/desktop-packaging.test.cjs scripts/__test__/main-bytecode.test.cjs scripts/__test__/bytecode-electron.test.cjs scripts/__test__/release-assets.test.cjs`。在 Windows 本机不能验证 Linux/macOS 的真实启动，必须查看对应 GitHub 任务的执行结果。
