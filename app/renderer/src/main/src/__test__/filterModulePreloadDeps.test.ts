import { describe, expect, it } from 'vitest'
import { filterModulePreloadDeps } from '../../scripts/filterModulePreloadDeps.mjs'

describe('filterModulePreloadDeps', () => {
  it('removes monaco / streamdown / milkdown chunks and workers from the preload list', () => {
    const deps = [
      'assets/index-abc.js',
      'assets/vendor-monaco-def.js',
      'assets/vendor-react-ghi.js',
      'assets/vendor-streamdown-aaa.js',
      'assets/vendor-milkdown-bbb.js',
      'assets/editor.worker-jkl.js',
      'assets/json.worker-mno.js?v=1',
      '/assets/monaco-editor-pqr.js',
      'assets/mermaid-xyz.js',
      'assets/style-stu.css',
    ]
    expect(filterModulePreloadDeps(deps)).toEqual([
      'assets/index-abc.js',
      'assets/vendor-react-ghi.js',
      'assets/style-stu.css',
    ])
  })

  it('returns an empty list for non-arrays', () => {
    expect(filterModulePreloadDeps(undefined)).toEqual([])
  })
})
