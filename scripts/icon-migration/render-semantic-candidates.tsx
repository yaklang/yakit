import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import React from '../../app/renderer/src/main/node_modules/react/index.js'
import { renderToStaticMarkup } from '../../app/renderer/src/main/node_modules/react-dom/server.js'
import puppeteer from 'puppeteer-core'

type Component = React.ElementType<Record<string, unknown>>
type Family = 'outline' | 'solid' | 'colorful'
type Theme = 'light' | 'dark'

interface Definition {
  id: string
  file: string
  symbol: string
  package_target: { family: Family; name: string; version: string }
}

const MODES = ['default', 'enterprise', 'simple-enterprise', 'irify', 'irify-enterprise', 'memfit'] as const
const THEMES: Theme[] = ['light', 'dark']
const VIEWPORT = { width: 1440, height: 2200, deviceScaleFactor: 1 }

const modePrimary: Record<(typeof MODES)[number], Record<Theme, string>> = {
  default: { light: '#f28c45', dark: '#db752e' },
  enterprise: { light: '#f28c45', dark: '#db752e' },
  'simple-enterprise': { light: '#f28c45', dark: '#db752e' },
  irify: { light: '#7957b2', dark: '#a176e8' },
  'irify-enterprise': { light: '#7957b2', dark: '#a176e8' },
  memfit: { light: '#4373bb', dark: '#5790d5' },
}

const sha256 = (value: crypto.BinaryLike) => crypto.createHash('sha256').update(value).digest('hex')
const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const wrapperName = (definition: Definition) => {
  if (definition.file.endsWith('/assets/commonProcessIcons.tsx')) {
    return definition.symbol === 'WordIconSvg' ? 'WordIconIcon' : definition.symbol.replace(/Svg$/, '')
  }
  if (definition.file.endsWith('/components/MilkdownEditor/icon/icon.tsx')) {
    return {
      list: 'IconList',
      notepadFileTypePPT: 'IconNotepadFileTypePPT',
      notepadFileTypeUnknown: 'IconNotepadFileTypeUnknown',
      notepadFileTypeWord: 'IconNotepadFileTypeWord',
    }[definition.symbol]
  }
  if (definition.file.endsWith('/pages/customizeMenu/icon/menuIcon.tsx')) return 'ExtraMenuCodecIcon'
  return `${definition.symbol}Icon`
}

const main = async () => {
  Object.assign(globalThis, { React })

  const definitionsIndex = process.argv.indexOf('--definitions')
  const outputIndex = process.argv.indexOf('--out-dir')
  const definitionsFile = path.resolve(
    process.argv[definitionsIndex + 1] ||
      '.omx/evidence/icon-migration/20260827T035700Z-full-local/transactions-input/main.definitions.json',
  )
  const outDir = path.resolve(
    process.argv[outputIndex + 1] || '.omx/evidence/icon-migration/semantic-candidates-complete',
  )
  const definitions = JSON.parse(await fs.readFile(definitionsFile, 'utf8')) as Definition[]

  if (definitions.length !== 61) throw new Error(`expected 61 migrated definitions, received ${definitions.length}`)
  if (new Set(definitions.map(({ id }) => id)).size !== definitions.length) throw new Error('duplicate definition IDs')

  const [outline, solid, colorful, newIcons, processIcons, riskIcons, aiIcons, logIcons, milkdownIcons, menuIcons] =
    await Promise.all([
      import('../../app/renderer/src/main/node_modules/@yakit-libs/yakit-ui-icons/dist/outline/index.js'),
      import('../../app/renderer/src/main/node_modules/@yakit-libs/yakit-ui-icons/dist/solid/index.js'),
      import('../../app/renderer/src/main/node_modules/@yakit-libs/yakit-ui-icons/dist/colorful/index.js'),
      import('../../app/renderer/src/main/src/assets/newIcon'),
      import('../../app/renderer/src/main/src/assets/commonProcessIcons'),
      import('../../app/renderer/src/main/src/pages/risks/icon'),
      import('../../app/renderer/src/main/src/pages/ai-agent/aiModelList/icon'),
      import('../../app/renderer/src/main/src/assets/icon/colors'),
      import('../../app/renderer/src/main/src/components/MilkdownEditor/icon/icon'),
      import('../../app/renderer/src/main/src/pages/customizeMenu/icon/menuIcon'),
    ])

  const packageFamilies: Record<Family, Record<string, unknown>> = { outline, solid, colorful }
  const localModules: Record<string, Record<string, unknown>> = {
    'app/renderer/src/main/src/assets/newIcon.tsx': newIcons,
    'app/renderer/src/main/src/assets/commonProcessIcons.tsx': processIcons,
    'app/renderer/src/main/src/pages/risks/icon.tsx': riskIcons,
    'app/renderer/src/main/src/pages/ai-agent/aiModelList/icon.tsx': aiIcons,
    'app/renderer/src/main/src/assets/icon/colors.tsx': logIcons,
    'app/renderer/src/main/src/components/MilkdownEditor/icon/icon.tsx': milkdownIcons,
    'app/renderer/src/main/src/pages/customizeMenu/icon/menuIcon.tsx': menuIcons,
  }
  const render = (Component: Component) => renderToStaticMarkup(React.createElement(Component))
  const rows = definitions.map((definition, index) => {
    const localName = wrapperName(definition)
    const LocalIcon = localName ? (localModules[definition.file]?.[localName] as Component | undefined) : undefined
    const PackageIcon = packageFamilies[definition.package_target.family][definition.package_target.name] as
      | Component
      | undefined
    if (!LocalIcon) throw new Error(`missing local wrapper ${definition.file}::${localName || definition.symbol}`)
    if (!PackageIcon) {
      throw new Error(`missing package component ${definition.package_target.family}/${definition.package_target.name}`)
    }
    return {
      ...definition,
      index: index + 1,
      localName,
      localMarkup: render(LocalIcon),
      packageMarkup: render(PackageIcon),
    }
  })

  const htmlFor = (mode: (typeof MODES)[number], theme: Theme) => {
    const background = theme === 'light' ? '#f8f9fa' : '#171717'
    const surface = theme === 'light' ? '#ffffff' : '#25272d'
    const text = theme === 'light' ? '#353639' : '#c8d0dd'
    const border = theme === 'light' ? '#d8dade' : '#43464f'
    const primary = modePrimary[mode][theme]
    const content = rows
      .map(
        (row) => `<article class="candidate" data-definition-id="${escapeHtml(row.id)}">
          <div class="name"><strong>${row.index}. ${escapeHtml(row.symbol)}</strong><span>${escapeHtml(
            row.package_target.family,
          )}/${escapeHtml(row.package_target.name)}</span><small>${escapeHtml(row.file)}</small></div>
          <button class="render local" data-kind="local" aria-label="Local ${escapeHtml(row.localName)}">
            ${row.localMarkup}
          </button>
          <button class="render package" data-kind="package" aria-label="Package ${escapeHtml(
            row.package_target.name,
          )}">
            ${row.packageMarkup}
          </button>
        </article>`,
      )
      .join('')

    return `<!doctype html><html data-theme="${theme}" data-mode="${mode}"><head><meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        :root { --Colors-Use-Main-Primary: ${primary}; --Colors-Use-Neutral-Text-1-Title: ${text}; }
        body { margin: 0; color: ${text}; background: ${background}; font: 12px -apple-system, BlinkMacSystemFont, sans-serif; }
        h1 { margin: 16px; font-size: 18px; }
        .grid { display: grid; grid-template-columns: repeat(3, minmax(420px, 1fr)); gap: 8px; padding: 0 16px 18px; }
        .candidate { min-height: 88px; display: grid; grid-template-columns: minmax(250px, 1fr) 60px 60px; align-items: center; gap: 8px; border: 1px solid ${border}; border-radius: 8px; padding: 10px; background: ${surface}; }
        .name { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .name strong, .name span, .name small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .name small { opacity: .66; }
        .render { width: 52px; height: 52px; display: grid; place-items: center; border: 1px solid ${border}; border-radius: 6px; color: inherit; background: color-mix(in srgb, currentColor 7%, transparent); cursor: pointer; }
        .render:focus-visible { outline: 2px solid ${primary}; outline-offset: 2px; }
        .render > span, .render > svg { display: inline-flex; width: 40px; height: 40px; }
        .render svg { width: 40px !important; height: 40px !important; max-width: 40px; max-height: 40px; }
      </style></head><body><h1>All 61 migrated icons · ${mode} · ${theme}</h1><section class="grid">${content}</section>
      <script>
        document.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
          button.dataset.activations = String(Number(button.dataset.activations || 0) + 1)
        }))
      </script></body></html>`
  }

  await fs.mkdir(outDir, { recursive: true })
  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const browser = await puppeteer.launch({ executablePath, headless: true })
  const cells = []
  const baselineHashes: string[] = []
  try {
    for (const mode of MODES) {
      for (const theme of THEMES) {
        const page = await browser.newPage()
        await page.setViewport(VIEWPORT)
        const html = htmlFor(mode, theme)
        await page.setContent(html, { waitUntil: 'networkidle0' })

        await page.focus('button.package')
        await page.keyboard.press('Enter')
        const firstPackage = await page.$('button.package')
        if (!firstPackage) throw new Error('missing representative package icon button')
        const target = await firstPackage.boundingBox()
        if (!target) throw new Error('representative package icon button has no pointer target')
        await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2)

        const audit = await page.evaluate(String.raw`(() => {
          const round = (value) => Math.round(value * 100) / 100
          const box = (element) => {
            const rect = element.getBoundingClientRect()
            return { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) }
          }
          const geometryFingerprint = (svg) => {
            const attributes = ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points', 'transform']
            return (svg.getAttribute('viewBox') || '') + '::' + [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse')]
              .map((node) => node.tagName + ':' + attributes.map((name) => name + '=' + (node.getAttribute(name) || '')).join('|'))
              .join('::')
          }
          const inspect = (button) => {
            const svg = button.querySelector('svg')
            if (!svg) throw new Error('missing SVG in ' + button.getAttribute('aria-label'))
            const svgRect = svg.getBoundingClientRect()
            const buttonRect = button.getBoundingClientRect()
            const paintNodes = [...svg.querySelectorAll('[fill],[stroke]')]
            const paintValues = paintNodes.flatMap((node) => [node.getAttribute('fill'), node.getAttribute('stroke')])
            const references = [...svg.querySelectorAll('*')].flatMap((node) =>
              [...node.attributes].flatMap((attribute) => {
                const result = [...attribute.value.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]).filter(Boolean)
                if ((attribute.name === 'href' || attribute.name === 'xlink:href') && attribute.value.startsWith('#')) result.push(attribute.value.slice(1))
                return result
              }),
            )
            const unresolved = references.filter((id) => !document.getElementById(id))
            return {
              accessibleName: button.getAttribute('aria-label'),
              activations: Number(button.dataset.activations || 0),
              buttonBounds: box(button),
              svgBounds: box(svg),
              hitTargetCoversSvg: buttonRect.left <= svgRect.left && buttonRect.top <= svgRect.top && buttonRect.right >= svgRect.right && buttonRect.bottom >= svgRect.bottom,
              clipped: svgRect.left < buttonRect.left - 0.5 || svgRect.top < buttonRect.top - 0.5 || svgRect.right > buttonRect.right + 0.5 || svgRect.bottom > buttonRect.bottom + 0.5,
              intrinsic: { width: svg.getAttribute('width'), height: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox') },
              paintNodeCount: paintNodes.length,
              currentColorPaints: paintValues.filter((value) => value === 'currentColor').length,
              tokenPaints: paintValues.filter((value) => value && value.includes('var(')).length,
              literalPaints: paintValues.filter((value) => value && value !== 'none' && value !== 'currentColor' && !value.includes('var(')).length,
              referencedDefinitionIds: [...new Set(references)],
              unresolvedDefinitionIds: [...new Set(unresolved)],
              geometryFingerprint: geometryFingerprint(svg),
            }
          }
          const rows = [...document.querySelectorAll('.candidate')].map((row) => {
            const local = inspect(row.querySelector('button.local'))
            const packageIcon = inspect(row.querySelector('button.package'))
            return { id: row.dataset.definitionId, local, package: packageIcon, exactGeometry: local.geometryFingerprint === packageIcon.geometryFingerprint }
          })
          return {
            documentTheme: document.documentElement.dataset.theme,
            mode: document.documentElement.dataset.mode,
            viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
            rows,
          }
        })()`)

        const screenshotFile = path.join(outDir, `semantic-${mode}-${theme}.png`)
        const jsonFile = path.join(outDir, `semantic-${mode}-${theme}.json`)
        await page.screenshot({ fullPage: true, path: screenshotFile })
        await fs.writeFile(jsonFile, `${JSON.stringify(audit, null, 2)}\n`)
        cells.push({
          mode,
          renderer: 'main',
          theme,
          route: 'icon-migration/semantic-comparison',
          state: 'all-61-migrated-icons',
          viewport: audit.viewport,
          screenshot: screenshotFile,
          audit: jsonFile,
          keyboardActivations: audit.rows[0]?.package.activations || 0,
          pointerTargetVerified: audit.rows[0]?.package.hitTargetCoversSvg || false,
          rows: audit.rows,
        })

        if (mode === 'default' && theme === 'light') {
          for (let index = 1; index <= 3; index += 1) {
            const file = path.join(outDir, `baseline-noise-${index}.png`)
            await page.screenshot({ fullPage: true, path: file })
            baselineHashes.push(sha256(await fs.readFile(file)))
          }
        }
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }

  const failures: string[] = []
  for (const cell of cells) {
    if (cell.rows.length !== definitions.length) failures.push(`${cell.mode}/${cell.theme}: row count`)
    if (cell.keyboardActivations < 2) failures.push(`${cell.mode}/${cell.theme}: keyboard/pointer activation`)
    if (!cell.pointerTargetVerified) failures.push(`${cell.mode}/${cell.theme}: pointer target`)
    for (const row of cell.rows) {
      const definition = definitions.find(({ id }) => id === row.id)
      if (!definition) {
        failures.push(`${cell.mode}/${cell.theme}/${row.id}: unknown definition`)
        continue
      }
      for (const [kind, icon] of [
        ['local', row.local],
        ['package', row.package],
      ] as const) {
        if (!icon.accessibleName) failures.push(`${cell.mode}/${cell.theme}/${row.id}/${kind}: accessible name`)
        if (icon.svgBounds.width <= 0 || icon.svgBounds.height <= 0) {
          failures.push(`${cell.mode}/${cell.theme}/${row.id}/${kind}: zero bounds`)
        }
        if (!icon.hitTargetCoversSvg) failures.push(`${cell.mode}/${cell.theme}/${row.id}/${kind}: hit target`)
        if (kind === 'package' && icon.clipped) failures.push(`${cell.mode}/${cell.theme}/${row.id}/${kind}: clipped`)
        if (kind === 'package' && icon.unresolvedDefinitionIds.length) {
          failures.push(`${cell.mode}/${cell.theme}/${row.id}/${kind}: SVG defs`)
        }
      }
      if (definition.package_target.family !== 'colorful' && row.package.currentColorPaints === 0) {
        failures.push(`${cell.mode}/${cell.theme}/${row.id}: currentColor contract`)
      }
      if (definition.package_target.family === 'colorful' && row.package.paintNodeCount === 0) {
        failures.push(`${cell.mode}/${cell.theme}/${row.id}: colorful paint contract`)
      }
    }
  }
  if (new Set(baselineHashes).size !== 1) failures.push('three-run baseline screenshot noise is non-zero')

  const defaultLight = cells.find((cell) => cell.mode === 'default' && cell.theme === 'light')
  const summary = {
    schema_version: 'icon-migration-semantic-comparison/v2',
    generated_at: new Date().toISOString(),
    definitions_file: definitionsFile,
    definition_count: definitions.length,
    modes: [...MODES],
    themes: THEMES,
    route: 'icon-migration/semantic-comparison',
    state: 'all-61-migrated-icons',
    baseline_noise: {
      captures: baselineHashes,
      distinct_hashes: new Set(baselineHashes).size,
      threshold: 0,
      verdict: new Set(baselineHashes).size === 1 ? 'pass' : 'fail',
    },
    classification: {
      exact_geometry: defaultLight?.rows.filter((row) => row.exactGeometry).length || 0,
      reviewed_design_refresh: defaultLight?.rows.filter((row) => !row.exactGeometry).length || 0,
    },
    baseline_findings: {
      local_clipped: defaultLight?.rows.filter((row) => row.local.clipped).length || 0,
      local_unresolved_defs: defaultLight?.rows.filter((row) => row.local.unresolvedDefinitionIds.length).length || 0,
      package_clipped: defaultLight?.rows.filter((row) => row.package.clipped).length || 0,
      package_unresolved_defs:
        defaultLight?.rows.filter((row) => row.package.unresolvedDefinitionIds.length).length || 0,
    },
    cells,
    failures,
    status: failures.length ? 'failed' : 'passed',
  }
  await fs.writeFile(path.join(outDir, 'semantic-comparison.json'), `${JSON.stringify(summary, null, 2)}\n`)
  await fs.writeFile(path.join(outDir, 'semantic-default-light.html'), htmlFor('default', 'light'))
  if (failures.length) throw new Error(`semantic icon comparison failed:\n${failures.slice(0, 40).join('\n')}`)
  process.stdout.write(`${outDir}\n`)
}

void main()
