import fs from 'node:fs'
import path from 'node:path'
import React from '../../app/renderer/src/main/node_modules/react/index.js'
import { renderToStaticMarkup } from '../../app/renderer/src/main/node_modules/react-dom/server.js'
import { DOMParser } from '@xmldom/xmldom'
import * as outline from '../../app/renderer/src/main/node_modules/@yakit-libs/yakit-ui-icons/dist/outline/index.js'
import * as solid from '../../app/renderer/src/main/node_modules/@yakit-libs/yakit-ui-icons/dist/solid/index.js'
import * as colorful from '../../app/renderer/src/main/node_modules/@yakit-libs/yakit-ui-icons/dist/colorful/index.js'

type IconFamily = 'outline' | 'solid' | 'colorful'
type Component = React.ElementType<Record<string, unknown>>

interface IconSignature {
  dimensions: {
    height: string
    viewBox: string
    width: string
  }
  visual: string
  visualWithSize: string
}

interface PackageIconRow extends IconSignature {
  family: IconFamily
  name: string
}

interface LocalIconRow extends Partial<IconSignature> {
  error?: string
  exactPackageMatches: Array<Pick<PackageIconRow, 'family' | 'name'>>
  exactPackageMatchesWithSize: Array<Pick<PackageIconRow, 'family' | 'name'>>
  module: string
  name: string
}

const main = async () => {
  const repoRoot = path.resolve(import.meta.dirname, '../..')

  // These legacy modules compile JSX with the classic runtime while importing React as a type only.
  // Their application bundles inject React, so mirror that runtime contract for the audit process.
  Object.assign(globalThis, { React })

  const mainNewIcon = await import('../../app/renderer/src/main/src/assets/newIcon')
  const mainCommonProcessIcons = await import('../../app/renderer/src/main/src/assets/commonProcessIcons')
  const mainColors = await import('../../app/renderer/src/main/src/assets/icon/colors')
  const mainIcons = await import('../../app/renderer/src/main/src/assets/icons')
  const mainBespokeOutline = await import('../../app/renderer/src/main/src/assets/icon/bespokeOutline')
  const mainBespokeSolid = await import('../../app/renderer/src/main/src/assets/icon/bespokeSolid')
  const linkNewIcon = await import('../../app/renderer/engine-link-startup/src/assets/newIcon')
  const linkColors = await import('../../app/renderer/engine-link-startup/src/assets/colors')
  const linkBespokeIcons = await import('../../app/renderer/engine-link-startup/src/assets/bespokeIcons')
  const linkModalIcons = await import('../../app/renderer/engine-link-startup/src/components/yakitUI/YakitModal/icon')

  const localModules = [
    { module: 'app/renderer/src/main/src/assets/newIcon.tsx', exports: mainNewIcon },
    { module: 'app/renderer/src/main/src/assets/commonProcessIcons.tsx', exports: mainCommonProcessIcons },
    { module: 'app/renderer/src/main/src/assets/icon/colors.tsx', exports: mainColors },
    { module: 'app/renderer/src/main/src/assets/icons.tsx', exports: mainIcons },
    { module: 'app/renderer/src/main/src/assets/icon/bespokeOutline.tsx', exports: mainBespokeOutline },
    { module: 'app/renderer/src/main/src/assets/icon/bespokeSolid.tsx', exports: mainBespokeSolid },
    { module: 'app/renderer/engine-link-startup/src/assets/newIcon.tsx', exports: linkNewIcon },
    { module: 'app/renderer/engine-link-startup/src/assets/colors.tsx', exports: linkColors },
    { module: 'app/renderer/engine-link-startup/src/assets/bespokeIcons.tsx', exports: linkBespokeIcons },
    {
      module: 'app/renderer/engine-link-startup/src/components/yakitUI/YakitModal/icon.tsx',
      exports: linkModalIcons,
    },
  ] as const

  const packageModules: Array<{ family: IconFamily; exports: Record<string, unknown> }> = [
    { family: 'outline', exports: outline },
    { family: 'solid', exports: solid },
    { family: 'colorful', exports: colorful },
  ]

  const normalizeSpace = (value: string) => value.trim().replace(/\s+/g, ' ')

  const replaceIds = (value: string, idMap: Map<string, string>) => {
    let normalized = value
    for (const [source, target] of idMap) normalized = normalized.replaceAll(source, target)
    return normalized
  }

  const signatureFor = (component: Component): IconSignature => {
    const markup = renderToStaticMarkup(React.createElement(component, {}))
    const document = new DOMParser().parseFromString(markup, 'text/html')
    const svg = document.getElementsByTagName('svg').item(0)
    if (!svg) throw new Error('rendered output contains no svg')

    const idMap = new Map<string, string>()
    const collectIds = (node: Node) => {
      if (node.nodeType === 1) {
        const element = node as Element
        const id = element.getAttribute('id')
        if (id && !idMap.has(id)) idMap.set(id, `icon-id-${idMap.size + 1}`)
      }
      for (let child = node.firstChild; child; child = child.nextSibling) collectIds(child)
    }
    collectIds(svg)

    const serialize = (node: Node, includeSize: boolean, isRoot = false): string => {
      if (node.nodeType === 3) return normalizeSpace(node.nodeValue || '')
      if (node.nodeType !== 1) return ''
      const element = node as Element
      const tagName = element.tagName
      if (tagName === 'title' || tagName === 'desc') return ''

      const ignoredRootAttributes = new Set([
        'aria-hidden',
        'focusable',
        'xmlns',
        'version',
        ...(includeSize ? [] : ['height', 'width']),
      ])
      const attributes = Array.from({ length: element.attributes.length }, (_, index) => element.attributes.item(index))
        .filter((attribute): attribute is Attr => Boolean(attribute))
        .filter((attribute) => !attribute.name.startsWith('data-'))
        .filter((attribute) => !(isRoot && ignoredRootAttributes.has(attribute.name)))
        .map((attribute) => [attribute.name, replaceIds(normalizeSpace(attribute.value), idMap)] as const)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
        .join(' ')
      const children = Array.from({ length: element.childNodes.length }, (_, index) => element.childNodes.item(index))
        .filter((child): child is Node => Boolean(child))
        .map((child) => serialize(child, includeSize))
        .filter(Boolean)
        .join('')
      return `<${tagName}${attributes ? ` ${attributes}` : ''}>${children}</${tagName}>`
    }

    return {
      dimensions: {
        height: svg.getAttribute('height') || '',
        viewBox: svg.getAttribute('viewBox') || '',
        width: svg.getAttribute('width') || '',
      },
      visual: serialize(svg, false, true),
      visualWithSize: serialize(svg, true, true),
    }
  }

  const packageIcons: PackageIconRow[] = packageModules.flatMap(({ family, exports }) =>
    Object.entries(exports).flatMap(([name, component]) => {
      try {
        return [{ family, name, ...signatureFor(component as Component) }]
      } catch {
        return []
      }
    }),
  )

  const packageByVisual = new Map<string, PackageIconRow[]>()
  const packageByVisualWithSize = new Map<string, PackageIconRow[]>()
  for (const icon of packageIcons) {
    packageByVisual.set(icon.visual, [...(packageByVisual.get(icon.visual) || []), icon])
    packageByVisualWithSize.set(icon.visualWithSize, [
      ...(packageByVisualWithSize.get(icon.visualWithSize) || []),
      icon,
    ])
  }

  const localIcons: LocalIconRow[] = localModules.flatMap(({ module, exports }) =>
    Object.entries(exports).map(([name, component]) => {
      try {
        const signature = signatureFor(component as Component)
        return {
          module,
          name,
          ...signature,
          exactPackageMatches: (packageByVisual.get(signature.visual) || []).map(({ family, name: packageName }) => ({
            family,
            name: packageName,
          })),
          exactPackageMatchesWithSize: (packageByVisualWithSize.get(signature.visualWithSize) || []).map(
            ({ family, name: packageName }) => ({ family, name: packageName }),
          ),
        }
      } catch (error) {
        return {
          module,
          name,
          error: error instanceof Error ? error.message : String(error),
          exactPackageMatches: [],
          exactPackageMatchesWithSize: [],
        }
      }
    }),
  )

  const result = {
    generatedAt: new Date().toISOString(),
    packageCounts: Object.fromEntries(
      packageModules.map(({ family }) => [family, packageIcons.filter((icon) => icon.family === family).length]),
    ),
    localModuleCounts: Object.fromEntries(
      localModules.map(({ module }) => [module, localIcons.filter((icon) => icon.module === module).length]),
    ),
    summary: {
      localExports: localIcons.length,
      renderableLocalIcons: localIcons.filter((icon) => icon.visual).length,
      exactVisualMatches: localIcons.filter((icon) => icon.exactPackageMatches.length > 0).length,
      exactVisualAndSizeMatches: localIcons.filter((icon) => icon.exactPackageMatchesWithSize.length > 0).length,
    },
    localIcons,
  }

  const outputIndex = process.argv.indexOf('--out')
  if (outputIndex >= 0) {
    const outputPath = process.argv[outputIndex + 1]
    if (!outputPath) throw new Error('--out requires a file path')
    const absoluteOutputPath = path.resolve(repoRoot, outputPath)
    fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true })
    fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(result, null, 2)}\n`)
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  }
}

void main()
