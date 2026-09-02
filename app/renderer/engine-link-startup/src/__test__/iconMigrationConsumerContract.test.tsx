import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { QuestionMarkCircleOutlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'

interface IconSizeContract {
  file: string
  icon: string
  sizes: Array<string | undefined>
}

const contracts: IconSizeContract[] = [
  {
    file: 'components/yakitUI/YakitAutoComplete/YakitAutoComplete.tsx',
    icon: 'XOutlined',
    sizes: ['16'],
  },
  {
    file: 'components/yakitUI/YakitSelect/YakitSelect.tsx',
    icon: 'XOutlined',
    sizes: ['16'],
  },
  {
    file: 'components/yakitUI/YakitSelect/YakitSelect.tsx',
    icon: 'CheckOutlined',
    sizes: ['16'],
  },
  {
    file: 'pages/StartupPage/components/MoreYaklangVersion/index.tsx',
    icon: 'SearchOutlined',
    sizes: ['16'],
  },
  {
    file: 'pages/StartupPage/components/RemoteEngine/RemoteEngine.tsx',
    icon: 'XOutlined',
    sizes: ['16'],
  },
  {
    file: 'pages/StartupPage/components/RemoteEngine/RemoteEngine.tsx',
    icon: 'QuestionMarkCircleOutlined',
    sizes: ['showSTL ? 24 : 16', '16'],
  },
  {
    file: 'pages/StartupPage/components/RemoteEngine/RemoteEngine.tsx',
    icon: 'ArrowCircleRightOutlined',
    sizes: ['16'],
  },
  {
    file: 'pages/StartupPage/components/YakitLoading/index.tsx',
    icon: 'ArrowCircleRightOutlined',
    sizes: ['16'],
  },
  {
    file: 'pages/StartupPage/components/YakitLoading/index.tsx',
    icon: 'QuestionMarkCircleOutlined',
    sizes: [undefined],
  },
]

const sourceRoot = path.resolve(__dirname, '..')

const collectIconSizes = (file: string, icon: string): Array<string | undefined> => {
  const filePath = path.join(sourceRoot, file)
  const sourceText = fs.readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const sizes: Array<string | undefined> = []

  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === icon) {
      const sizeAttribute = node.attributes.properties.find(
        (attribute): attribute is ts.JsxAttribute =>
          ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'size',
      )

      if (!sizeAttribute?.initializer) {
        sizes.push(undefined)
      } else if (ts.isStringLiteral(sizeAttribute.initializer)) {
        sizes.push(sizeAttribute.initializer.text)
      } else if (ts.isJsxExpression(sizeAttribute.initializer)) {
        sizes.push(sizeAttribute.initializer.expression?.getText(sourceFile))
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return sizes
}

describe('icon migration consumer size contracts', () => {
  it.each(contracts)('$file keeps $icon inner SVG sizing', ({ file, icon, sizes }) => {
    expect(collectIconSizes(file, icon)).toEqual(sizes)
  })

  it('passes an explicit size through the wrapper to the inner SVG', () => {
    const markup = renderToStaticMarkup(createElement(XOutlined, { size: 16 }))

    expect(markup).toMatch(/^<span[^>]*><svg width="16" height="16"/)
  })

  it('preserves the package default for the intentional 24px exception', () => {
    const markup = renderToStaticMarkup(createElement(QuestionMarkCircleOutlined))

    expect(markup).toMatch(/^<span[^>]*><svg width="24" height="24"/)
  })
})
