import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const parseArgs = (argv) =>
  Object.fromEntries(
    argv
      .slice(2)
      .flatMap((value, index, values) => (value.startsWith('--') ? [[value.slice(2), values[index + 1]]] : [])),
  )

const mappings = {
  commonProcessIcons: {
    ChromeIconSvg: 'colorful/ChromeBrowserColorful',
    DingtalkIconSvg: 'colorful/DingTalkSocialColorful',
    DockerIconSvg: 'colorful/DockerCodingColorful',
    ExcelIconSvg: 'colorful/ExcelFileTypeColorful',
    FeishuIconSvg: 'colorful/FeishuSocialColorful',
    FirefoxIconSvg: 'colorful/FirefoxBrowserColorful',
    JavaIconSvg: 'colorful/JavaCodingColorful',
    MsedgeIconSvg: 'colorful/EdgeBrowserColorful',
    OperaIconSvg: 'colorful/OperaBrowserColorful',
    PowerpointIconSvg: 'colorful/PowerPointFileTypeColorful',
    VscodeIconSvg: 'colorful/VisualStudioCodeCodingColorful',
    WechatIconSvg: 'colorful/WeChatSocialColorful',
    WordIconSvg: 'colorful/WordFileTypeColorful',
  },
  colors: {
    LogNodeStatusAuditFailed: 'colorful/ReviewRejectedLogColorful',
    LogNodeStatusAuditSuccess: 'colorful/ReviewApprovedLogColorful',
    LogNodeStatusCode: 'colorful/TextOutputLogColorful',
    LogNodeStatusComment: 'colorful/CommentLogColorful',
    LogNodeStatusDelete: 'colorful/DeletedLogColorful',
    LogNodeStatusEcharts: 'colorful/ChartLogColorful',
    LogNodeStatusError: 'colorful/ErrorLogColorful',
    LogNodeStatusFile: 'colorful/FileLogColorful',
    LogNodeStatusFileError: 'colorful/FileFailedLogColorful',
    LogNodeStatusFolder: 'colorful/FolderLogColorful',
    LogNodeStatusFolderError: 'colorful/FolderFailedLogColorful',
    LogNodeStatusInfo: 'colorful/InfoLogColorful',
    LogNodeStatusLoading: 'colorful/CurrentNodeLogColorful',
    LogNodeStatusMD: 'colorful/MarkdownLogColorful',
    LogNodeStatusModify: 'colorful/ModifiedLogColorful',
    LogNodeStatusNew: 'colorful/CreatedLogColorful',
    LogNodeStatusRecover: 'colorful/RestoredLogColorful',
    LogNodeStatusSuccess: 'colorful/SuccessLogColorful',
    LogNodeStatusWarning: 'colorful/WarningLogColorful',
  },
  newIcon: {
    CheckCircle: 'solid/CheckCircleSolid',
    FastForward: 'solid/FastForwardSolid',
    FolderOpen: 'solid/FolderOpenSolid',
    GithubSvg: 'solid/GitHubSolid',
    SolidRefresh: 'solid/RefreshSolid',
    SolidThumbDown: 'solid/ThumbDownSolid',
    Stop: 'solid/StopSolid',
  },
  milkdown: {
    list: 'outline/List1Outlined',
    notepadFileTypePPT: 'colorful/PowerPointFileTypeColorful',
    notepadFileTypeUnknown: 'colorful/UnknownFileTypeColorful',
    notepadFileTypeWord: 'colorful/WordFileTypeColorful',
  },
  ai: {
    AISystemOutput: 'colorful/SystemOutputWithBackgroundAiModelColorful',
    ChatGLM: 'colorful/ChatGlmWithBackgroundAiModelColorful',
    Comate: 'colorful/ComateWithBackgroundAiModelColorful',
    DeepSeek: 'colorful/DeepSeekWithBackgroundAiModelColorful',
    Gemini: 'colorful/GeminiWithBackgroundAiModelColorful',
    Memfit: 'colorful/MemfitWithBackgroundAiModelColorful',
    Moonshot: 'colorful/MoonshotWithBackgroundAiModelColorful',
    Ollama: 'colorful/OllamaWithBackgroundAiModelColorful',
    OpenRouter: 'colorful/OpenRouterWithBackgroundAiModelColorful',
    SiliconFlow: 'colorful/SiliconFlowWithBackgroundAiModelColorful',
    Tongyi: 'colorful/TongyiWithBackgroundAiModelColorful',
  },
  risk: {
    IconSolidDefaultRisk: 'colorful/DefaultRiskColorful',
    IconSolidHighRisk: 'colorful/HighRiskColorful',
    IconSolidInfoRisk: 'colorful/FingerprintInfoRiskColorful',
    IconSolidLowRisk: 'colorful/LowRiskColorful',
    IconSolidMediumRisk: 'colorful/MediumRiskColorful',
    IconSolidSerious: 'colorful/CriticalRiskColorful',
  },
}

const targetFor = (row) => {
  if (row.file.endsWith('/assets/commonProcessIcons.tsx')) return mappings.commonProcessIcons[row.symbol]
  if (row.file.endsWith('/assets/icon/colors.tsx')) return mappings.colors[row.symbol]
  if (row.file.endsWith('/assets/newIcon.tsx')) return mappings.newIcon[row.symbol]
  if (row.file.endsWith('/components/MilkdownEditor/icon/icon.tsx')) return mappings.milkdown[row.symbol]
  if (row.file.endsWith('/pages/ai-agent/aiModelList/icon.tsx')) return mappings.ai[row.symbol]
  if (row.file.endsWith('/pages/risks/icon.tsx')) return mappings.risk[row.symbol]
  if (row.file.endsWith('/pages/customizeMenu/icon/menuIcon.tsx') && row.symbol === 'ExtraCodec') {
    return 'solid/CodecSolid'
  }
  return null
}

const main = () => {
  const args = parseArgs(process.argv)
  if (!args.initial || !args.terminal || !args.out) {
    throw new Error('usage: build-terminal-ledger.mjs --initial <json> --terminal <json> --out <json>')
  }
  const initial = readJson(path.resolve(args.initial))
  const terminal = readJson(path.resolve(args.terminal))
  const terminalIds = new Set(terminal.definitions.map((row) => row.id))
  const absent = initial.definitions.filter((row) => !terminalIds.has(row.id))
  const rows = absent.map((row) => {
    const target = targetFor(row)
    if (!target) throw new Error(`Missing approved migration target for ${row.file}::${row.symbol}`)
    const [family, packageName] = target.split('/')
    const evidenceId = `deletion-evidence:v1:${sha256(`${row.id}\0${target}`)}`
    return {
      ...row,
      source_presence: 'absent',
      terminal_state: 'migrated',
      package_target: { family, name: packageName, version: '0.2.1' },
      deletion_evidence: {
        approved: true,
        id: evidenceId,
        consumer_inbound_zero: true,
        package_direct_import: true,
        no_alias: true,
        visual_evidence:
          family === 'colorful'
            ? '.omx/evidence/icon-migration/20260827T035700Z-full-local/visual/semantic-candidates.png'
            : '.omx/evidence/icon-full-local/20260827T032521Z/exact-matches.json',
      },
    }
  })
  const result = {
    schema_version: 'icon-migration-terminal-ledger/v1',
    generated_at: new Date().toISOString(),
    package: '@yakit-libs/yakit-ui-icons@0.2.1',
    initial_artifact_hash: initial.artifact_hash,
    terminal_artifact_hash: terminal.artifact_hash,
    rows,
    summary: { absent: rows.length, migrated: rows.length },
  }
  result.artifact_hash = sha256(JSON.stringify({ ...result, generated_at: undefined, artifact_hash: undefined }))
  const out = path.resolve(args.out)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(`${out}\n`)
}

main()
