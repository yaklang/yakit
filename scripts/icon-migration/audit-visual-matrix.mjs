import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const SCHEMA_VERSION = 'icon-migration-visual-matrix/v2'
const TOOL_VERSION = '1.0.0'
const MODES = ['default', 'enterprise', 'simple-enterprise', 'irify', 'irify-enterprise', 'memfit']
const RENDERERS = ['main', 'link']
const THEMES = ['light', 'dark']
const EXPECTED_PRIMARY = {
  default: { light: '#f28c45', dark: '#db752e' },
  enterprise: { light: '#f28c45', dark: '#db752e' },
  'simple-enterprise': { light: '#f28c45', dark: '#db752e' },
  irify: { light: '#7957b2', dark: '#a176e8' },
  'irify-enterprise': { light: '#7957b2', dark: '#a176e8' },
  memfit: { light: '#4373bb', dark: '#5790d5' },
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')
const readJsonArtifact = (file) => {
  const absolute = path.resolve(file)
  const bytes = fs.readFileSync(absolute)
  return { path: absolute, sha256: sha256(bytes), value: JSON.parse(bytes.toString('utf8')) }
}
const parseArgs = () => {
  const result = {}
  for (let index = 2; index < process.argv.length; index += 2)
    result[process.argv[index].slice(2)] = process.argv[index + 1]
  return result
}
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

const main = () => {
  const args = parseArgs()
  for (const name of ['live-dir', 'semantic', 'ledger', 'universe', 'out']) {
    if (!args[name]) throw new Error(`missing --${name}`)
  }
  const liveDir = path.resolve(args['live-dir'])
  const semantic = readJsonArtifact(args.semantic)
  const ledger = readJsonArtifact(args.ledger)
  const universe = readJsonArtifact(args.universe)
  const failures = []
  const liveCells = []

  for (const mode of MODES) {
    const summaryFile = path.join(liveDir, `${mode}-icon-visual-summary.json`)
    const summary = readJsonArtifact(summaryFile)
    if (summary.value.status !== 'passed') failures.push(`${mode}: live summary is not passed`)
    for (const renderer of RENDERERS) {
      const interactions =
        renderer === 'main'
          ? [summary.value.surfaces?.main?.interaction]
          : summary.value.surfaces?.link?.interactions || []
      if (!interactions.filter(Boolean).length) failures.push(`${mode}/${renderer}: missing interaction evidence`)
      for (const theme of THEMES) {
        const auditFile = path.join(liveDir, `${mode}-${renderer}-${theme}.json`)
        const screenshotFile = path.join(liveDir, `${mode}-${renderer}-${theme}.png`)
        const audit = readJsonArtifact(auditFile)
        const screenshot = fs.readFileSync(screenshotFile)
        const cell = audit.value
        const key = `${mode}/${renderer}/${theme}`
        if (cell.mode !== mode || cell.surface !== renderer || cell.theme !== theme || cell.documentTheme !== theme) {
          failures.push(`${key}: mode/renderer/theme identity mismatch`)
        }
        if (cell.viewport?.width !== 1280 || cell.viewport?.height !== 900 || cell.viewport?.devicePixelRatio !== 1) {
          failures.push(`${key}: viewport/DPR mismatch`)
        }
        if (cell.themeTokens?.primary?.toLowerCase() !== EXPECTED_PRIMARY[mode][theme]) {
          failures.push(`${key}: primary theme token mismatch`)
        }
        if (cell.packageIconCount < 1 || cell.packageHitTargetCount < cell.packageIconCount) {
          failures.push(`${key}: package icon visibility/hit target mismatch`)
        }
        if (cell.packageOccludedCount !== 0) failures.push(`${key}: package icon occlusion`)
        for (const icon of cell.packageIcons || []) {
          if (icon.bounds?.width <= 0 || icon.bounds?.height <= 0) failures.push(`${key}: zero icon bounds`)
          if (icon.clipped) failures.push(`${key}: clipped package icon`)
          if (icon.unresolvedDefinitionIds?.length) failures.push(`${key}: unresolved SVG definitions`)
          if (icon.paintNodeCount < 1 || icon.currentColorPaints < 1) failures.push(`${key}: paint contract`)
        }
        liveCells.push({
          mode,
          renderer,
          theme,
          route: cell.url,
          state: renderer === 'main' ? 'startup-shell-visible' : 'engine-link-active-visible',
          viewport: cell.viewport,
          package_icon_count: cell.packageIconCount,
          package_hit_target_count: cell.packageHitTargetCount,
          clipped_count: cell.packageIcons.filter((icon) => icon.clipped).length,
          unresolved_defs_count: cell.packageIcons.reduce(
            (count, icon) => count + icon.unresolvedDefinitionIds.length,
            0,
          ),
          accessibility: {
            classification: 'decorative-package-glyph-in-live-shell',
            named_control_and_keyboard_evidence: semantic.path,
          },
          interaction: interactions,
          audit: { path: audit.path, sha256: audit.sha256 },
          screenshot: { path: path.resolve(screenshotFile), sha256: sha256(screenshot) },
          summary: { path: summary.path, sha256: summary.sha256 },
        })
      }
    }
  }

  const expectedCellCount = MODES.length * RENDERERS.length * THEMES.length
  const uniqueCellKeys = new Set(liveCells.map(({ mode, renderer, theme }) => `${mode}/${renderer}/${theme}`))
  if (liveCells.length !== expectedCellCount || uniqueCellKeys.size !== expectedCellCount) {
    failures.push(`expected ${expectedCellCount} unique live cells, received ${uniqueCellKeys.size}`)
  }

  if (
    semantic.value.status !== 'passed' ||
    semantic.value.definition_count !== 61 ||
    semantic.value.cells?.length !== 12
  ) {
    failures.push('semantic comparison is incomplete')
  }
  if (semantic.value.baseline_noise?.verdict !== 'pass' || semantic.value.baseline_noise?.threshold !== 0) {
    failures.push('semantic baseline noise gate failed')
  }
  for (const cell of semantic.value.cells || []) {
    if (cell.rows?.length !== 61 || cell.keyboardActivations < 2 || !cell.pointerTargetVerified) {
      failures.push(`${cell.mode}/${cell.theme}: semantic interaction/a11y evidence incomplete`)
    }
    for (const row of cell.rows || []) {
      if (!row.package.accessibleName || row.package.clipped || row.package.unresolvedDefinitionIds.length) {
        failures.push(`${cell.mode}/${cell.theme}/${row.id}: semantic package contract failed`)
      }
    }
  }

  const migratedRows = ledger.value.rows?.filter((row) => row.terminal_state === 'migrated') || []
  if (migratedRows.length !== 61 || migratedRows.some((row) => !row.deletion_evidence?.approved)) {
    failures.push('terminal ledger does not approve exactly 61 migrated definitions')
  }
  if (universe.value.summary?.definitions !== 585 || universe.value.summary?.local_react_icons !== 431) {
    failures.push('terminal universe counts differ from the approved reconciliation')
  }

  const result = {
    schema_version: SCHEMA_VERSION,
    tool: { name: 'audit-visual-matrix', version: TOOL_VERSION },
    generated_at: new Date().toISOString(),
    package: '@yakit-libs/yakit-ui-icons@0.2.1',
    expected_matrix: {
      modes: MODES,
      renderers: RENDERERS,
      themes: THEMES,
      routes_and_states_required: true,
      viewport: { width: 1280, height: 900 },
      device_pixel_ratio: 1,
    },
    inputs: {
      live_directory: liveDir,
      semantic: { path: semantic.path, sha256: semantic.sha256 },
      ledger: { path: ledger.path, sha256: ledger.sha256 },
      universe: { path: universe.path, sha256: universe.sha256 },
    },
    live_cells: liveCells,
    semantic_matrix: {
      path: semantic.path,
      sha256: semantic.sha256,
      cells: semantic.value.cells.map(({ mode, renderer, theme, route, state, viewport, screenshot, audit }) => ({
        mode,
        renderer,
        theme,
        route,
        state,
        viewport,
        screenshot,
        audit,
      })),
      definition_count: semantic.value.definition_count,
      classification: semantic.value.classification,
      baseline_findings: semantic.value.baseline_findings,
      baseline_noise: semantic.value.baseline_noise,
      named_package_controls: 61,
      keyboard_and_pointer_cells: semantic.value.cells.length,
    },
    reconciliation: {
      migrated_definitions: migratedRows.length,
      retained_local_definitions: universe.value.summary.local_react_icons,
      terminal_universe_definitions: universe.value.summary.definitions,
    },
    failures,
    status: { pass: failures.length === 0, exit_code: failures.length ? 1 : 0 },
  }
  result.artifact_hash = sha256(JSON.stringify({ ...result, generated_at: undefined, artifact_hash: undefined }))
  writeJson(path.resolve(args.out), result)
  if (failures.length) throw new Error(`visual matrix audit failed:\n${failures.join('\n')}`)
  process.stdout.write(`${path.resolve(args.out)}\n`)
}

main()
