import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const knowledgeTableSource = readFileSync(
  path.resolve(testDir, '../../../pages/KnowledgeBase/compoment/KnowledgeTable.tsx'),
  'utf8',
)

describe('KnowledgeTable React row key contract', () => {
  it('uses HiddenIndex for React identity while retaining ID as the business render key', () => {
    expect(knowledgeTableSource).toMatch(
      /const getKnowledgeTableRowKey = \(record: KnowledgeBaseEntry\) => record\.HiddenIndex/,
    )
    expect(knowledgeTableSource).toContain('renderKey="ID"')
    expect(knowledgeTableSource).toContain('getRowKey={getKnowledgeTableRowKey}')
  })
})
