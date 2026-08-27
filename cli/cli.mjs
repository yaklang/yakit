#!/usr/bin/env node
/**
 * 仓库唯一 CLI 入口。一条命令只做一件事：解析参数 → 注入 YAKIT_* → spawn 本地 bin。
 *
 * 执行分两段：
 * 1. install / add / remove 在加载 commander 之前拦截（只用 Node 内置，全新 clone 可跑）
 * 2. 其余命令再加载 commander / inquirer / execa，注册 start / build / pack / electron / dev
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  genCLIDisplayList,
  importWithHint,
  detectPackageManager,
  packageManagerHint,
  withLocalBin,
  isTTY,
  repoRoot,
  MAIN_RENDER_DIR,
  LINK_RENDER_DIR,
} from './utils.mjs'
import { EDITIONS, SYSTEMS, INSTALL_TARGETS, isEdition, isSystem, isInstallTarget, buildYakitEnv } from './env.mjs'
import {
  RootHelpExtraDoc,
  InstallCMDExamplesDoc,
  AddCMDExamplesDoc,
  RemoveCMDExamplesDoc,
  StartCMDExamplesDoc,
  BuildCMDExamplesDoc,
  PackCMDExamplesDoc,
  ElectronCMDExamplesDoc,
  DevCMDExamplesDoc,
  editionValues,
  systemValues,
} from './config.mjs'

/** 在 cwd 下 spawn yarn/npm/pnpm，stdio 交给当前终端；非 0 退出码 reject */
const spawnPm = (pm, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(pm, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(Object.assign(new Error(`${pm} ${args.join(' ')} failed`), { exitCode: code || 1 }))
    })
  })

/** electron | main | link → { name, cwd }；非法 target 返回 null */
const resolvePkgTarget = (target) => {
  if (target === 'electron') return { name: 'Electron (root)', cwd: repoRoot }
  if (target === 'main') return { name: 'Main-Render', cwd: MAIN_RENDER_DIR }
  if (target === 'link') return { name: 'Link-Render', cwd: LINK_RENDER_DIR }
  return null
}

/** 识别当前包管理器；认不出则打印提示并 exit 1 */
const detectPmOrExit = () => {
  const pm = detectPackageManager()
  if (!pm) {
    console.error(`Error: 无法识别包管理器。请使用: ${packageManagerHint()}`)
    process.exit(1)
  }
  return pm
}

/** 拼 add/remove 的 argv：命令原样转发；仅 npm 把 --dev 换成 --save-dev */
const pmMutateArgs = (pm, action, rest) => {
  const mapped = rest.map((arg) => {
    if (pm === 'npm' && arg === '--dev') return '--save-dev'
    return arg
  })
  return [action, ...mapped]
}

/** yarn cli build/start 在根目录需要的包（不含 Electron / electron-builder） */
const CLI_RUNTIME_PACKAGES = ['chalk', 'commander', 'concurrently', 'execa', 'inquirer']

/** 只把 CLI 运行时装进根 node_modules，不改 package.json / lockfile，也不跑 electron postinstall */
const installCliRuntime = async () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
  const specs = CLI_RUNTIME_PACKAGES.map((name) => {
    const ver = pkg.devDependencies?.[name] || pkg.dependencies?.[name]
    if (!ver) {
      console.error(`Error: 根 package.json 未声明 ${name}`)
      process.exit(1)
    }
    return `${name}@${ver}`
  })
  console.log(`Start install CLI runtime (npm --no-save, skip Electron) ...`)
  await spawnPm('npm', ['install', '--no-save', '--no-package-lock', '--ignore-scripts', ...specs], repoRoot)
}

/** 安装依赖。无 target 时按 electron → link → main 依次 install；cli 只装 CLI 运行时 */
const runCliInstall = async (target) => {
  if (target && !isInstallTarget(target)) {
    console.error(`Error: 无效的安装目标 "${target}". 支持: ${INSTALL_TARGETS.join(' | ')} | cli`)
    process.exit(1)
  }

  if (target === 'cli') {
    await installCliRuntime()
    return
  }

  const pm = detectPmOrExit()
  const targets = target
    ? [resolvePkgTarget(target)]
    : [resolvePkgTarget('electron'), resolvePkgTarget('link'), resolvePkgTarget('main')]

  for (const item of targets) {
    console.log(`Start install ${item.name} (${pm}) ...`)
    await spawnPm(pm, ['install'], item.cwd)
  }
}

/** 在指定子项目 add/remove 包。target 必填，rest 里至少要有一个非 flag 包名 */
const runCliMutate = async (action, target, rest) => {
  const item = resolvePkgTarget(target)
  if (!item) {
    console.error(`Error: 无效的目标 "${target || ''}". 支持: ${INSTALL_TARGETS.join(' | ')}`)
    process.exit(1)
  }
  const pkgs = rest.filter((arg) => !arg.startsWith('-'))
  if (pkgs.length === 0) {
    console.error(`Error: 请指定要 ${action === 'add' ? '添加' : '移除'} 的包名`)
    process.exit(1)
  }

  const pm = detectPmOrExit()
  const args = pmMutateArgs(pm, action, rest)
  console.log(`${action} ${item.name} (${pm} ${args.join(' ')}) ...`)
  await spawnPm(pm, args, item.cwd)
}

/** 零依赖拦截：不经过 commander，直接处理 install/add/remove（含 -h） */
const cliArgs = process.argv.slice(2)
if (cliArgs[0] === 'install' || cliArgs[0] === 'add' || cliArgs[0] === 'remove') {
  if (cliArgs.includes('-h') || cliArgs.includes('--help')) {
    if (cliArgs[0] === 'install') {
      console.log(`Usage: yarn cli install [electron | main | link | cli]`)
      console.log('安装依赖（默认根目录 + 两个渲染端）。install 不依赖 commander，全新 clone 可直接执行。')
      console.log('cli：只装根目录 CLI 运行时（commander / execa 等），不含 Electron。')
      console.log(InstallCMDExamplesDoc)
    } else if (cliArgs[0] === 'add') {
      console.log(`Usage: yarn cli add <electron | main | link> <pkg...> [-D|--dev]`)
      console.log('在指定子项目添加依赖（转发到 yarn add / npm add / pnpm add）。')
      console.log(AddCMDExamplesDoc)
    } else {
      console.log(`Usage: yarn cli remove <electron | main | link> <pkg...>`)
      console.log('在指定子项目移除依赖（转发到 yarn remove / npm remove / pnpm remove）。')
      console.log(RemoveCMDExamplesDoc)
    }
    process.exit(0)
  }
  try {
    if (cliArgs[0] === 'install') {
      await runCliInstall(cliArgs[1] && !cliArgs[1].startsWith('-') ? cliArgs[1] : undefined)
    } else {
      await runCliMutate(cliArgs[0], cliArgs[1], cliArgs.slice(2))
    }
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(error?.exitCode || 1)
  }
}

// 以下命令需要根目录依赖；缺包时 importWithHint 会提示先跑 install
const { MainChalk, RedChalk, BlueChalk, YellowChalk, GreenChalk, CyanChalk } = await import('./chalk.mjs')

const Command = await importWithHint('commander', (mod) => mod.Command)
const inquirer = await importWithHint('inquirer', (mod) => mod.default)
const execa = await importWithHint('execa', (mod) => mod.execa)
const concurrently = await importWithHint('concurrently', (mod) => mod.default)

const ErrorHeaderTitle = RedChalk('ERR! ')
/** electron-builder 配置路径（相对仓库根） */
const BUILDER_CONFIG = './packageScript/electron-builder.config.js'

/** 子进程失败时打印错误并以原 exitCode 退出 */
const exitOnError = (error) => {
  console.log(error)
  process.exit(error?.exitCode || 1)
}

/** 跑 inquirer；Ctrl+C 视为正常退出（ExitPromptError），其它错误 exit 1 */
const promptOrExit = async (questions) => {
  try {
    return await inquirer.prompt(questions)
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.log('👋 Exit Command Guidance!')
      process.exit(0)
    }
    process.exit(error?.exitCode || 1)
  }
}

/**
 * 解析业务版本（-v）。已传则校验词表；未传时 TTY 弹列表，非 TTY（CI）直接报错。
 */
const requireEdition = async (version) => {
  if (version) {
    if (!isEdition(version)) {
      console.log(
        RedChalk(`Error: 无效的业务版本 "${version}".\n支持列表: \n${genCLIDisplayList(EDITIONS, 'value', 'name')}`),
      )
      process.exit(1)
    }
    return version
  }
  if (!isTTY()) {
    console.log(RedChalk(`Error: 缺少 -v / --version。合法取值: ${editionValues}`))
    process.exit(1)
  }
  console.log(BlueChalk('未检测到业务版本，进入交互模式...'))
  const answers = await promptOrExit([
    {
      type: 'list',
      name: 'version',
      message: '请选择业务版本:',
      choices: EDITIONS,
    },
  ])
  return answers.version
}

/** 解析打包系统（-s）。规则同 requireEdition：校验 / TTY 询问 / CI 缺参退出 */
const requireSystem = async (system) => {
  if (system) {
    if (!isSystem(system)) {
      console.log(
        RedChalk(`Error: 无效的 system "${system}".\n支持列表: \n${genCLIDisplayList(SYSTEMS, 'value', 'name')}`),
      )
      process.exit(1)
    }
    return system
  }
  if (!isTTY()) {
    console.log(RedChalk(`Error: 缺少 -s / --system。合法取值: ${systemValues}`))
    process.exit(1)
  }
  console.log(BlueChalk('未检测到系统版本，进入交互模式...'))
  const answers = await promptOrExit([
    {
      type: 'list',
      name: 'system',
      message: '请选择系统版本:',
      choices: SYSTEMS,
    },
  ])
  return answers.system
}

/**
 * --main / --link 互斥。都不传则两端都跑；同时传则报错。
 * @returns {{ main: boolean, link: boolean }}
 */
const resolveRenderTargets = (main, link) => {
  if (main && link) {
    console.log(RedChalk('Error: --main 与 --link 不能同时使用（默认两端都跑）'))
    process.exit(1)
  }
  if (main) return { main: true, link: false }
  if (link) return { main: false, link: true }
  return { main: true, link: true }
}

/** 把渲染端选择格式化成日志里的「Link & Main」/「Main-Render」/「Link-Render」 */
const renderLabel = ({ main, link }) => {
  if (main && link) return 'Link & Main'
  if (main) return 'Main-Render'
  return 'Link-Render'
}

/** 用 execa 跑本地 bin（vite / tsc / electron / electron-builder），PATH 指向 cwd 的 .bin，并带上 YAKIT_* */
const runLocal = (file, args, { cwd, env } = {}) =>
  execa(file, args, {
    cwd: cwd || repoRoot,
    env: withLocalBin(cwd || repoRoot, env),
    stdio: 'inherit',
    preferLocal: true,
    localDir: cwd || repoRoot,
  })

/** 在指定渲染端目录跑 vite（开发）或 vite build（生产） */
const runVite = async ({ cwd, build, env }) => {
  const args = build ? ['build'] : []
  await runLocal('vite', args, { cwd, env })
}

/**
 * 启动或构建渲染端。只跑一端时串行；两端都跑时 concurrently，失败则互杀。
 * Link 生产构建会先 tsc -b 再 vite build。
 */
const runRenderers = async ({ main, link, build, env }) => {
  const jobs = []
  if (link) {
    jobs.push({
      name: BlueChalk('link'),
      cwd: LINK_RENDER_DIR,
      build,
    })
  }
  if (main) {
    jobs.push({
      name: MainChalk('main'),
      cwd: MAIN_RENDER_DIR,
      build,
    })
  }

  if (jobs.length === 1) {
    const job = jobs[0]
    if (build && job.cwd === LINK_RENDER_DIR) {
      await runLocal('tsc', ['-b'], { cwd: job.cwd, env })
    }
    await runVite({ cwd: job.cwd, build, env })
    return
  }

  const { result } = concurrently(
    jobs.map((job) => {
      const binEnv = withLocalBin(job.cwd, env)
      const command = build && job.cwd === LINK_RENDER_DIR ? 'tsc -b && vite build' : build ? 'vite build' : 'vite'
      return {
        command,
        name: job.name,
        cwd: job.cwd,
        env: binEnv,
      }
    }),
    {
      killOthers: ['failure'],
      prefix: '[{name}]',
    },
  )
  await result
}

/** commander 程序：注册子命令并解析 argv（install/add/remove 的 action 实际不会跑到） */
const program = new Command()

program
  .name('yarn cli')
  .usage('<command>')
  .description('统一启动 / 构建 / 打包 CLI（yarn、npm、pnpm 均可调用）')
  .addHelpText(
    'beforeAll',
    BlueChalk(`
  ╭─────────────────────────────────────────────────────╮
  │                                                     │
  │   Yakit CLI                                         │
  │   install / add / remove                            │
  │   start / build / pack / electron / dev             │
  │                                                     │
  ╰─────────────────────────────────────────────────────╯
  `),
  )
  .addHelpText('after', `${YellowChalk.bold('Usage:')}${RootHelpExtraDoc}`)

program.configureOutput({
  writeErr: (str) => process.stdout.write(`${ErrorHeaderTitle}${str}`),
  outputError: (str, write) => write(str.replace(/^error:/i, '')),
})

// 下面 install/add/remove 只为 yarn cli -h 列出子命令；真正执行已被文件前部拦截
program
  .command('install')
  .description('安装依赖（默认根目录 + 两个渲染端）')
  .argument('[target]', '只装其中一个: electron | main | link | cli')
  .addHelpText('after', `\n${YellowChalk.bold('Examples:')}\n${InstallCMDExamplesDoc}`)
  .action(async (target) => {
    try {
      await runCliInstall(target)
    } catch (error) {
      exitOnError(error)
    }
  })

program
  .command('add')
  .description(`在指定子项目添加依赖 (${INSTALL_TARGETS.join(' | ')})`)
  .argument('<target>', `子项目: ${INSTALL_TARGETS.join(' | ')}`)
  .argument('<packages...>', '包名，可带版本与 -D/--dev')
  .addHelpText('after', `\n${YellowChalk.bold('Examples:')}\n${AddCMDExamplesDoc}`)
  .action(async (target, packages) => {
    try {
      await runCliMutate('add', target, packages)
    } catch (error) {
      exitOnError(error)
    }
  })

program
  .command('remove')
  .description(`在指定子项目移除依赖 (${INSTALL_TARGETS.join(' | ')})`)
  .argument('<target>', `子项目: ${INSTALL_TARGETS.join(' | ')}`)
  .argument('<packages...>', '包名')
  .addHelpText('after', `\n${YellowChalk.bold('Examples:')}\n${RemoveCMDExamplesDoc}`)
  .action(async (target, packages) => {
    try {
      await runCliMutate('remove', target, packages)
    } catch (error) {
      exitOnError(error)
    }
  })

/** start：注入 YAKIT_EDITION + DEVTOOLS，开发态跑 vite（不启 Electron） */
program
  .command('start')
  .description('开发模式启动渲染端（默认 main + link）')
  .option('-v, --version <type>', `业务版本 (${editionValues})`)
  .option('--main', '只启动主渲染端', false)
  .option('--link', '只启动 Link 渲染端', false)
  .addHelpText('after', `\n${YellowChalk.bold('Examples:')}\n${StartCMDExamplesDoc}`)
  .action(async (options) => {
    const version = await requireEdition(options.version)
    const targets = resolveRenderTargets(options.main, options.link)
    const env = buildYakitEnv({ edition: version, devtools: true })

    console.log(GreenChalk('\n准备执行...'))
    console.log(CyanChalk.bold(`> 业务版本: ${version}`))
    console.log(CyanChalk.bold(`> 模式: Development`))
    console.log(CyanChalk.bold(`> 渲染端: ${renderLabel(targets)}`))
    console.log('')

    try {
      await runRenderers({ ...targets, build: false, env })
    } catch (error) {
      exitOnError(error)
    }
  })

/** build：生产构建。--no-license 在 commander 里是 options.license === false */
program
  .command('build')
  .description('生产构建渲染端（默认 main + link）')
  .option('-v, --version <type>', `业务版本 (${editionValues})`)
  .option('--main', '只构建主渲染端', false)
  .option('--link', '只构建 Link 渲染端', false)
  .option('--devtools', '产物中打开开发者工具 UI', false)
  .option('--no-license', '企业版跳过 License 校验')
  .option('--analyzer', '打开 bundle 分析', false)
  .addHelpText('after', `\n${YellowChalk.bold('Examples:')}\n${BuildCMDExamplesDoc}`)
  .action(async (options) => {
    const version = await requireEdition(options.version)
    const targets = resolveRenderTargets(options.main, options.link)
    const env = buildYakitEnv({
      edition: version,
      devtools: options.devtools,
      analyzer: options.analyzer,
      skipEnterpriseLicense: options.license === false,
    })

    console.log(GreenChalk('\n准备执行...'))
    console.log(CyanChalk.bold(`> 业务版本: ${version}`))
    console.log(CyanChalk.bold(`> 模式: Production`))
    console.log(CyanChalk.bold(`> show devTools: ${options.devtools ? 'Yes' : 'No'}`))
    console.log(CyanChalk.bold(`> 渲染端: ${renderLabel(targets)}`))
    console.log('')

    try {
      await runRenderers({ ...targets, build: true, env })
    } catch (error) {
      exitOnError(error)
    }
  })

/** pack：electron-builder 打安装包；mwl 则 win/mac/linux 各打一次。本机默认不签名 */
program
  .command('pack')
  .description('使用 electron-builder 打安装包')
  .option('-s, --system <type>', `系统 (${systemValues})`)
  .option('-v, --version <type>', `业务版本 (${editionValues})`)
  .option('--legacy', '旧版兼容模式', false)
  .option('--sign', '开启 macOS 签名/公证探测 (CSC_IDENTITY_AUTO_DISCOVERY=true)', false)
  .addHelpText('after', `\n${YellowChalk.bold('Examples:')}\n${PackCMDExamplesDoc}`)
  .action(async (options) => {
    const system = await requireSystem(options.system)
    const version = await requireEdition(options.version)
    const env = buildYakitEnv({
      edition: version,
      legacy: options.legacy,
      sign: Boolean(options.sign),
    })
    if (!options.sign) env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'

    console.log(GreenChalk('\n准备执行...'))
    console.log(CyanChalk.bold(`> 系统版本: ${system}`))
    console.log(CyanChalk.bold(`> 业务版本: ${version}`))
    console.log(CyanChalk.bold(`> legacy: ${options.legacy ? 'Yes' : 'No'}`))
    console.log(CyanChalk.bold(`> sign: ${options.sign ? 'Yes' : 'No'}`))
    console.log('')

    /** 打单个系统：electron-builder build --win|--mac|--linux */
    const packOne = async (os) => {
      console.log(MainChalk.bold(`Start packing ${os} ...`))
      await runLocal('electron-builder', ['build', `--${os}`, '--config', BUILDER_CONFIG], { env })
    }

    try {
      if (system === 'mwl') {
        await packOne('win')
        await packOne('mac')
        await packOne('linux')
      } else {
        await packOne(system)
      }
    } catch (error) {
      exitOnError(error)
    }
  })

/** electron：只起主进程。不注入版本；窗口加载当前已运行的 :3000/:5173 */
program
  .command('electron')
  .description('启动 Electron 主进程（开发，不区分业务版本）')
  .addHelpText('after', `\n${YellowChalk.bold('Examples:')}\n${ElectronCMDExamplesDoc}`)
  .action(async () => {
    console.log(CyanChalk('开始启动 Electron 开发环境...\n'))
    try {
      await runLocal('electron', ['.'])
    } catch (error) {
      exitOnError(error)
    }
  })

/** dev：两端 vite + wait-on 端口 LISTEN 后起 Electron（端口就绪 ≠ 页面编译完成） */
program
  .command('dev')
  .description('启动两端渲染，等待 :3000/:5173 后启动 Electron')
  .option('-v, --version <type>', `业务版本 (${editionValues})`)
  .addHelpText('after', `\n${YellowChalk.bold('Examples:')}\n${DevCMDExamplesDoc}`)
  .action(async (options) => {
    const version = await requireEdition(options.version)
    const env = buildYakitEnv({ edition: version, devtools: true })

    console.log(GreenChalk('\n准备执行...'))
    console.log(CyanChalk.bold(`> 业务版本: ${version}`))
    console.log(CyanChalk.bold(`> start + wait-on :3000/:5173 + electron`))
    console.log('')

    try {
      const { result } = concurrently(
        [
          {
            command: 'vite',
            name: BlueChalk('link'),
            cwd: LINK_RENDER_DIR,
            env: withLocalBin(LINK_RENDER_DIR, env),
          },
          {
            command: 'vite',
            name: MainChalk('main'),
            cwd: MAIN_RENDER_DIR,
            env: withLocalBin(MAIN_RENDER_DIR, env),
          },
          {
            command: 'wait-on tcp:3000 tcp:5173 && electron .',
            name: GreenChalk('electron'),
            cwd: repoRoot,
            env: withLocalBin(repoRoot, env),
          },
        ],
        {
          // 关掉 Electron 是成功退出；必须连 success 一起互杀，否则两端 vite 会把 CLI 卡住
          killOthers: ['success', 'failure'],
          // 以先退出的进程为准：关窗口视为成功，避免被杀掉的 vite 把整个命令打成失败
          successCondition: 'first',
          prefix: '[{name}]',
        },
      )
      await result
    } catch (error) {
      exitOnError(error)
    }
  })

program.parse(process.argv)
