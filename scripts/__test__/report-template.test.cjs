const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const AdmZip = require('adm-zip')
const { sourceTemplate, verifyReportTemplate, verifyPackagedReportTemplate } = require('../report-template')

function fixture(run) {
  const tempRoot = fs.realpathSync(os.tmpdir())
  const temp = fs.mkdtempSync(path.join(tempRoot, 'report-template-test-'))
  try {
    return run(temp)
  } finally {
    assert.equal(path.dirname(path.resolve(temp)), tempRoot)
    assert.ok(path.basename(temp).startsWith('report-template-test-'))
    fs.rmSync(temp, { recursive: true, force: true })
  }
}

test('the tracked report template contains usable HTML and an empty data placeholder', () => {
  assert.equal(verifyReportTemplate(), sourceTemplate)
  const zip = new AdmZip(sourceTemplate)
  assert.equal(zip.readAsText('js/init.js').trim(), 'let initData="";')
  assert.match(zip.readAsText('index.html'), /<html\b/i)
})

test('missing, empty, malformed, truncated and corrupt report archives fail before packaging', () => {
  fixture((temp) => {
    const file = path.join(temp, 'template.zip')
    assert.throws(() => verifyReportTemplate(file), /Report template missing or empty/)
    fs.writeFileSync(file, '')
    assert.throws(() => verifyReportTemplate(file), /Report template missing or empty/)
    fs.writeFileSync(file, 'not a ZIP')
    assert.throws(() => verifyReportTemplate(file), /Invalid report template ZIP/)
    fs.writeFileSync(file, fs.readFileSync(sourceTemplate).subarray(0, 200))
    assert.throws(() => verifyReportTemplate(file), /Invalid report template ZIP/)
    const corrupt = fs.readFileSync(sourceTemplate)
    const offset = new AdmZip(corrupt).getEntry('index.html').header.offset
    const dataOffset = offset + 30 + corrupt.readUInt16LE(offset + 26) + corrupt.readUInt16LE(offset + 28)
    corrupt[dataOffset] ^= 0xff
    fs.writeFileSync(file, corrupt)
    assert.throws(() => verifyReportTemplate(file), /Invalid report template ZIP/)
  })
})

test('a report ZIP with missing or empty runtime entries is rejected', () => {
  fixture((temp) => {
    const file = path.join(temp, 'template.zip')
    const missing = new AdmZip(sourceTemplate)
    missing.deleteFile('js/init.js')
    missing.writeZip(file)
    assert.throws(() => verifyReportTemplate(file), /entry missing or empty: js\/init.js/)
    const empty = new AdmZip(sourceTemplate)
    empty.deleteFile('modules/JQuery/jquery.js')
    empty.addFile('modules/JQuery/jquery.js', Buffer.alloc(0))
    empty.writeZip(file)
    assert.throws(() => verifyReportTemplate(file), /entry missing or empty: modules\/JQuery\/jquery.js/)
  })
})

test('the packaging hook refuses an unavailable template for every edition', async () => {
  const helper = require.cache[require.resolve('../report-template')]
  const originalExports = helper.exports
  const hookPath = require.resolve('../../packageScript/buildHook/before-pack')
  const originalHook = require.cache[hookPath]
  const previousPlatform = process.env.PLATFORM
  const failure = new Error('Report template missing or empty: test fixture')
  try {
    helper.exports = {
      ...originalExports,
      verifyReportTemplate: () => {
        throw failure
      },
    }
    delete require.cache[hookPath]
    const hook = require(hookPath)
    for (const platform of ['', 'yakitEE', 'yakitSE', 'irify', 'irifyEE', 'memfit']) {
      process.env.PLATFORM = platform
      await assert.rejects(hook({}), (error) => error === failure)
    }
  } finally {
    helper.exports = originalExports
    if (originalHook) require.cache[hookPath] = originalHook
    else delete require.cache[hookPath]
    if (previousPlatform === undefined) delete process.env.PLATFORM
    else process.env.PLATFORM = previousPlatform
  }
})

test('installed templates are checked beside resources on Windows/Linux and inside Mac Contents', () => {
  fixture((temp) => {
    for (const appRoot of [path.join(temp, 'installed'), path.join(temp, 'AI Senso.app', 'Contents')]) {
      const archive = path.join(appRoot, 'resources', 'app.asar')
      const report = path.join(appRoot, 'report', 'template.zip')
      assert.throws(() => verifyPackagedReportTemplate(archive), /Report template missing or empty/)
      fs.mkdirSync(path.dirname(report), { recursive: true })
      fs.copyFileSync(sourceTemplate, report)
      assert.equal(verifyPackagedReportTemplate(archive), report)
    }
  })
})

test('the packager copies the tracked template to the unchanged runtime path', () => {
  const config = require('../../packageScript/electron-builder.config')
  assert.deepEqual(
    config.extraFiles.find((file) => file.to === 'report/template.zip'),
    {
      from: 'build/report-template.zip',
      to: 'report/template.zip',
    },
  )
  assert.ok(config.files.includes('!build/**/*'))
})
