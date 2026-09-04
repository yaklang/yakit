import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const stylesheet = readFileSync(path.resolve(testDir, '../TableVirtualResize.module.scss'), 'utf8')

const getRuleBlock = (selector: string): string => {
  const ruleStart = stylesheet.indexOf(`${selector} {`)
  expect(ruleStart, `Missing SCSS rule: ${selector}`).toBeGreaterThanOrEqual(0)

  const blockStart = stylesheet.indexOf('{', ruleStart)
  let depth = 0

  for (let index = blockStart; index < stylesheet.length; index += 1) {
    if (stylesheet[index] === '{') depth += 1
    if (stylesheet[index] === '}') depth -= 1
    if (depth === 0) return stylesheet.slice(blockStart + 1, index)
  }

  throw new Error(`Unclosed SCSS rule: ${selector}`)
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const expectDeclaration = (rule: string, declaration: string) => {
  const separatorIndex = declaration.indexOf(':')
  const property = declaration.slice(0, separatorIndex)
  const value = declaration.slice(separatorIndex + 1)

  expect(rule).toMatch(new RegExp(`^\\s*${escapeRegExp(property)}\\s*:\\s*${escapeRegExp(value)}\\s*;`, 'm'))
}

describe('TableVirtualResize fixed column positioning contract', () => {
  it('preserves the body fixed column sticky positions', () => {
    const fixedLeft = getRuleBlock('.virtual-table-row-fixed-left')
    const fixedRight = getRuleBlock('.virtual-table-row-fixed-right')

    expectDeclaration(fixedLeft, 'position:sticky')
    expectDeclaration(fixedLeft, 'left:0')

    expectDeclaration(fixedRight, 'position:sticky')
    expectDeclaration(fixedRight, 'right:0')
    expectDeclaration(fixedRight, 'top:0')
    expectDeclaration(fixedRight, 'z-index:1')
  })

  it('preserves the fixed column paint and header stacking rules', () => {
    const rowContent = getRuleBlock('.virtual-table-row-content')
    const fixedRightShadow = getRuleBlock(
      '.virtual-table-row-content + .virtual-table-row-fixed-right:nth-last-child(1)',
    )
    const titleFixedLeft = getRuleBlock('.virtual-table-title-fixed-left')
    const titleFixedRight = getRuleBlock('.virtual-table-title-fixed-right')

    expectDeclaration(rowContent, 'background-color:var(--Colors-Use-Basic-Background)')
    expectDeclaration(fixedRightShadow, 'box-shadow:-4px 0px 6px var(--Colors-Use-Basic-Shadow)')

    expectDeclaration(titleFixedLeft, 'position:sticky')
    expectDeclaration(titleFixedLeft, 'left:0')
    expectDeclaration(titleFixedLeft, 'top:0')
    expectDeclaration(titleFixedLeft, 'z-index:5')

    expectDeclaration(titleFixedRight, 'position:sticky')
    expectDeclaration(titleFixedRight, 'right:0')
    expectDeclaration(titleFixedRight, 'top:0')
    expectDeclaration(titleFixedRight, 'z-index:5')
  })
})
