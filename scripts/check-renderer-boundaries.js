const fs = require('fs')
const path = require('path')
const { builtinModules } = require('module')

const repositoryRoot = path.resolve(__dirname, '..')
const rendererRoot = path.join(repositoryRoot, 'app/renderer/src/main/src')
const browserExtensionRoot = path.join(rendererRoot, 'pages/browserExtension')
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
const allowedBrowserPolyfills = new Set(['buffer'])
const builtins = new Set(builtinModules.map((name) => name.replace(/^node:/, '').split('/')[0]))

function sourceFiles(root) {
  const files = []
  const pending = [root]
  while (pending.length) {
    const directory = pending.pop()
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        pending.push(absolutePath)
      } else if (sourceExtensions.has(path.extname(entry.name))) {
        files.push(absolutePath)
      }
    }
  }
  return files
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length
}

function moduleReferences(source) {
  const references = []
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(source)) !== null) {
      references.push({ moduleName: match[1], index: match.index })
    }
  }
  return references
}

function builtinRoot(moduleName) {
  const withoutPrefix = moduleName.replace(/^node:/, '')
  const root = withoutPrefix.split('/')[0]
  return builtins.has(root) ? root : undefined
}

function relativePath(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).replaceAll(path.sep, '/')
}

const violations = []
for (const absolutePath of sourceFiles(rendererRoot)) {
  const source = fs.readFileSync(absolutePath, 'utf8')
  for (const reference of moduleReferences(source)) {
    const root = builtinRoot(reference.moduleName)
    if (!root || allowedBrowserPolyfills.has(root)) continue
    violations.push({
      file: relativePath(absolutePath),
      line: lineAt(source, reference.index),
      reason:
        'Renderer must not bundle Node/Electron module "' +
        reference.moduleName +
        '"; expose a narrow preload bridge instead',
    })
  }
}

const browserBoundaryPatterns = [
  {
    pattern: /(?:window|\(window\s+as\s+any\))\s*\.\s*require\s*\(/g,
    reason: 'browserExtension must use the typed preload bridge, not window.require',
  },
  {
    pattern: /\bipcRenderer\b/g,
    reason: 'browserExtension must not access ipcRenderer directly',
  },
  {
    pattern: /\bwindow\s*\.\s*yakitBridge\b/g,
    reason: 'browserExtension must import the typed electronBridge facade',
  },
]

for (const absolutePath of sourceFiles(browserExtensionRoot)) {
  const source = fs.readFileSync(absolutePath, 'utf8')
  for (const rule of browserBoundaryPatterns) {
    let match
    while ((match = rule.pattern.exec(source)) !== null) {
      violations.push({
        file: relativePath(absolutePath),
        line: lineAt(source, match.index),
        reason: rule.reason,
      })
    }
  }
}

if (violations.length) {
  console.error('Renderer boundary check failed:')
  for (const violation of violations) {
    console.error('  ' + violation.file + ':' + violation.line + ' - ' + violation.reason)
  }
  process.exitCode = 1
} else {
  console.log(
    'Renderer boundary check passed: no Node/Electron imports and browserExtension uses the typed preload bridge.',
  )
}
