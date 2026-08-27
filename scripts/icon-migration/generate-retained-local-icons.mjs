import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '../..')
const ts = createRequire(path.resolve(REPO_ROOT, 'app/renderer/src/main/package.json'))('typescript')

const parseArgs = (argv) =>
  Object.fromEntries(
    argv
      .slice(2)
      .flatMap((value, index, values) => (value.startsWith('--') ? [[value.slice(2), values[index + 1]]] : [])),
  )

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

const rejectedCandidates = new Map(
  [
    ['routes/privateIcon.tsx', 'PrivateOutlineMitm', 'MitmOutlineColorful', '暗色主题下包内固定深色路径不可见'],
    [
      'routes/privateIcon.tsx',
      'PrivateOutlineWebFuzzer',
      'WebFuzzerSecondaryOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'routes/privateIcon.tsx',
      'PrivateOutlinePoc',
      'TargetedVulnerabilityDetectionOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'routes/privateIcon.tsx',
      'PrivateSolidPoc',
      'TargetedVulnerabilityDetectionSolidColorful',
      '新版固定色改变暗色结构',
    ],
    [
      'routes/privateIcon.tsx',
      'PrivateOutlinePluginStore',
      'PluginRepositoryOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'routes/privateIcon.tsx',
      'PrivateOutlineICMPSizeLog',
      'IcmpSizeLogOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    ['routes/privateIcon.tsx', 'PrivateOutlinePorts', 'PortAssetsOutlineColorful', '暗色主题下包内固定深色路径不可见'],
    [
      'routes/privateIcon.tsx',
      'PrivateOutlineWebsiteTree',
      'WebsiteTreeOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'routes/privateIcon.tsx',
      'PrivateOutlineHTTPHistory',
      'HttpHistoryOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'routes/privateIcon.tsx',
      'PrivateOutlineDefaultPlugin',
      'PluginOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    ['routes/privateIcon.tsx', 'PrivateOutlineCodeScan', 'RuleManagementOutlineColorful', '几何接近但功能语义不一致'],
    [
      'routes/publicIcon.tsx',
      'PublicDirectoryScanning',
      'DirectoryScanSecondaryMenuColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    ['routes/publicIcon.tsx', 'PublicNotepad', 'NotebookOutlineColorful', '暗色主题下包内固定深色路径不可见'],
    [
      'pages/customizeMenu/icon/menuIcon.tsx',
      'MITMInteractiveHijacking',
      'MitmOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'pages/customizeMenu/icon/menuIcon.tsx',
      'WebFuzzer',
      'WebFuzzerSecondaryOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'pages/customizeMenu/icon/menuIcon.tsx',
      'SpecialVulnerabilityDetection',
      'TargetedVulnerabilityDetectionOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'pages/customizeMenu/icon/menuIcon.tsx',
      'BatchVulnerabilityDetection',
      'BatchVulnerabilityDetectionOutlineColorful',
      '暗色主题结构与本地主题 token 版本不一致',
    ],
    [
      'pages/customizeMenu/icon/menuIcon.tsx',
      'PluginWarehouse',
      'PluginRepositoryOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'pages/customizeMenu/icon/menuIcon.tsx',
      'ICMPSizeLog',
      'IcmpSizeLogOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'pages/customizeMenu/icon/menuIcon.tsx',
      'PortAssets',
      'PortAssetsOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'pages/customizeMenu/icon/menuIcon.tsx',
      'HTTPHistory',
      'HttpHistoryOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'pages/customizeMenu/icon/menuIcon.tsx',
      'DefaultPlugin',
      'PluginOutlineColorful',
      '暗色主题下包内固定深色路径不可见',
    ],
    [
      'pages/ai-agent/aiModelList/icon.tsx',
      'OpenAI',
      'OpenAiWithBackgroundAiModelColorful',
      '本地为绿色圆底白色 glyph，包内为白底黑色 glyph',
    ],
    [
      'engine-link-startup/src/assets/bespokeIcons.tsx',
      'OutlineExitIcon',
      'FigmaIcon28011794Outlined',
      '包组件增加 span；现有 CSS 只缩放 svg，替换会改变内层尺寸',
    ],
    ['assets/icon/bespokeSolid.tsx', 'SolidFloatwin', 'FigmaIcon28011690Solid', '遮罩填充和 currentColor 行为不同'],
    ['assets/icon/bespokeSolid.tsx', 'SolidTodown', 'FigmaIcon28011686Solid', '遮罩填充和描边宽度不同'],
    ['assets/icon/bespokeSolid.tsx', 'SolidToright', 'FigmaIcon28011688Solid', '遮罩填充和描边宽度不同'],
    ['assets/icon/bespokeSolid.tsx', 'SolidToleft', 'FigmaIcon28011687Solid', '遮罩填充和描边宽度不同'],
  ].map(([fileSuffix, symbol, packageName, reason]) => [`${fileSuffix}::${symbol}`, { packageName, reason }]),
)

const escapeCell = (value) =>
  String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>')

const collectBindingNames = (name, output) => {
  if (ts.isIdentifier(name)) output.add(name.text)
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) collectBindingNames(element.name, output)
    }
  }
}

const exportedNamesByFile = new Map()

const exportedNames = (file) => {
  if (exportedNamesByFile.has(file)) return exportedNamesByFile.get(file)
  const absolute = path.resolve(REPO_ROOT, file)
  const source = ts.createSourceFile(
    absolute,
    fs.readFileSync(absolute, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const names = new Set()
  for (const statement of source.statements) {
    const isExported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    if (isExported && ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) collectBindingNames(declaration.name, names)
    } else if (isExported && (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))) {
      if (statement.name) names.add(statement.name.text)
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        names.add((specifier.propertyName ?? specifier.name).text)
      }
    } else if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      names.add(statement.expression.text)
    }
  }
  exportedNamesByFile.set(file, names)
  return names
}

const exportStatus = (row) => {
  if (row.origin_kind === 're-export') return 're-exported'
  return row.symbol && exportedNames(row.file).has(row.symbol) ? 'exported' : 'local/non-exported'
}

const ownerFollowUp = (row) => {
  if (row.disposition === 'runtime-or-brand-risk') {
    return 'Yakit UI/品牌视觉维护者；包候选更新后补六模式亮暗主题、DOM/交互与品牌色证据'
  }
  return '@yakit-libs/yakit-ui-icons 维护者；新版本出现候选后补严格几何/paint/尺寸等价证据'
}

const main = () => {
  const args = parseArgs(process.argv)
  if (!args.terminal || !args.initial || !args.out) {
    throw new Error(
      'usage: generate-retained-local-icons.mjs --initial <json> --terminal <json> --out <md> [--ledger <json>]',
    )
  }

  const initial = readJson(path.resolve(args.initial))
  const terminal = readJson(path.resolve(args.terminal))
  const ledger =
    args.ledger && fs.existsSync(path.resolve(args.ledger)) ? readJson(path.resolve(args.ledger)) : { rows: [] }
  const retained = terminal.definitions
    .filter((row) => row.scope_decision === 'local-react-icon' && row.source_presence === 'present')
    .sort((left, right) => left.file.localeCompare(right.file) || left.source_span.start - right.source_span.start)
  const initialIcons = initial.definitions.filter((row) => row.scope_decision === 'local-react-icon')
  const edgesByDefinition = Map.groupBy(terminal.consumer_graph || [], (edge) => edge.definition_id)
  const files = Map.groupBy(retained, (row) => row.file)
  const rendererCounts = Map.groupBy(retained, (row) => row.renderer_membership.join('+'))
  const migrated = (ledger.rows || []).filter(
    (row) => row.source_presence === 'absent' && ['migrated', 'deleted'].includes(row.terminal_state),
  )
  const migratedIcons = migrated.filter((row) => row.scope_decision === 'local-react-icon')

  if (new Set(retained.map((row) => row.id)).size !== retained.length) {
    throw new Error('terminal retained definitions contain duplicate discovery IDs')
  }
  for (const row of retained) {
    if (!fs.existsSync(path.resolve(REPO_ROOT, row.file))) throw new Error(`retained file does not exist: ${row.file}`)
    if (!row.source_span || !row.source_fingerprint) throw new Error(`retained row lacks latest span/hash: ${row.id}`)
  }

  const lines = [
    '# Yakit 剩余本地 React 图标清单',
    '',
    `> 自动生成于 ${new Date().toISOString()}。数据源为本次迁移的 initial/terminal 全源码 universe；包版本为 \`@yakit-libs/yakit-ui-icons@0.2.1\`。`,
    '',
    '## 结果摘要',
    '',
    `- 初始本地图标定义：${initialIcons.length}`,
    `- 已迁移/删除本地图标定义：${migratedIcons.length}`,
    `- 已删除 React SVG 审计信号：${migrated.length}（含 ${
      migrated.length - migratedIcons.length
    } 个初始语义分类误判，均有包映射与删除证据）`,
    `- 当前保留定义：${retained.length}`,
    `- 当前保留文件：${files.size}`,
    `- Main：${rendererCounts.get('main')?.length || 0}；Link：${rendererCounts.get('link')?.length || 0}`,
    '',
    '本清单只记录语义审计判定为 `local-react-icon` 的定义；被独立审计判定为非图标 React SVG 视觉的条目不计入。`runtime-or-brand-risk` 表示涉及主题、品牌、DOM wrapper、运行时 ID/defs 或交互风险；`no-package-equivalent` 表示 0.2.1 中没有得到严格等价证据。',
    '',
    '## 已明确拒绝的相似候选',
    '',
    '多色菜单候选在浅色主题中接近，但包内固定深色路径在暗色主题中不可见，因此保留本地 theme-token 版本。完整亮/暗对比证据位于 `.omx/evidence/icon-migration/20260827T035700Z-full-local/visual/semantic-candidates.png`。OpenAI、Link Exit 和部分浮窗方向图标也因颜色或 DOM/CSS 合约不同而保留。',
    '',
    '## 逐文件清单',
    '',
  ]

  for (const [file, rows] of files) {
    lines.push(
      `### \`${file}\``,
      '',
      '| Symbol / anchor | Definition ID | Latest span / hash | Origin / export status | Disposition | Consumers | Retention rationale | Closest rejected package candidate | Evidence | Owner / follow-up |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    )
    for (const row of rows) {
      const suffix = [...rejectedCandidates.keys()].find((key) => {
        const [fileSuffix, symbol] = key.split('::')
        return file.endsWith(fileSuffix) && row.symbol === symbol
      })
      const rejected = suffix ? rejectedCandidates.get(suffix) : null
      const edges = edgesByDefinition.get(row.id) || []
      const consumerSummary = edges.length
        ? `${edges.reduce((sum, edge) => sum + edge.occurrences, 0)} occurrence / ${
            new Set(edges.map((edge) => edge.consumer_file)).size
          } file<br>${[...new Set(edges.map((edge) => `\`${edge.consumer_file}\``))].join('<br>')}`
        : '0'
      const rationale = rejected?.reason || row.rationale || '保留，等待严格等价证据'
      const candidateText = rejected ? `\`${rejected.packageName}\`（已拒绝）` : '—'
      lines.push(
        `| \`${escapeCell(row.symbol || row.canonical_anchor)}\` | \`${row.id}\` | \`${row.source_span.start}-${
          row.source_span.end
        }\`<br>\`${row.source_fingerprint}\` | \`${row.origin_kind}\`<br>\`${exportStatus(row)}\` | \`${escapeCell(
          row.disposition,
        )}\` | ${consumerSummary} | ${escapeCell(rationale)} | ${candidateText} | ${escapeCell(
          (row.evidence || []).join(', '),
        )} | ${escapeCell(ownerFollowUp(row))} |`,
      )
    }
    lines.push('')
  }

  lines.push(
    '## 后续处理规则',
    '',
    '只有在新的包版本提供严格几何、paint、尺寸、DOM/事件及亮暗主题证据后，才重新评估 `no-package-equivalent`。涉及品牌或运行时行为的条目还必须通过对应产品模式的视觉回归；不要仅按名称替换。',
    '',
  )

  const out = path.resolve(args.out)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, `${lines.join('\n')}\n`)
  process.stdout.write(`${out}\n`)
}

main()
