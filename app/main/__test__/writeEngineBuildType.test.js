const fs = require('fs')
const os = require('os')
const path = require('path')

const writeEngineBuildTypeFile = require('../../../packageScript/buildHook/write-engine-build-type')

describe('writeEngineBuildTypeFile', () => {
  let cwd
  let prevCwd
  let prevEdition
  let prevLegacy

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-engine-build-type-'))
    prevCwd = process.cwd()
    prevEdition = process.env.YAKIT_EDITION
    prevLegacy = process.env.YAKIT_LEGACY
    process.chdir(cwd)
  })

  afterEach(() => {
    process.chdir(prevCwd)
    if (prevEdition === undefined) delete process.env.YAKIT_EDITION
    else process.env.YAKIT_EDITION = prevEdition
    if (prevLegacy === undefined) delete process.env.YAKIT_LEGACY
    else process.env.YAKIT_LEGACY = prevLegacy
    fs.rmSync(cwd, { recursive: true, force: true })
  })

  const readType = () => fs.readFileSync(path.join(cwd, 'bins', 'engine-build-type.txt'), 'utf8')

  it('marks community Yakit as slim', () => {
    process.env.YAKIT_EDITION = 'yakit'
    delete process.env.YAKIT_LEGACY
    expect(writeEngineBuildTypeFile()).toBe('slim')
    expect(readType()).toBe('slim')
  })

  it('defaults to slim when YAKIT_EDITION is unset (community Yakit)', () => {
    delete process.env.YAKIT_EDITION
    delete process.env.YAKIT_LEGACY
    expect(writeEngineBuildTypeFile()).toBe('slim')
    expect(readType()).toBe('slim')
  })

  it('keeps enterprise and other editions on full', () => {
    process.env.YAKIT_EDITION = 'yakitEE'
    expect(writeEngineBuildTypeFile()).toBe('full')
    process.env.YAKIT_EDITION = 'yakitSE'
    expect(writeEngineBuildTypeFile()).toBe('full')
    process.env.YAKIT_EDITION = 'irify'
    expect(writeEngineBuildTypeFile()).toBe('full')
    process.env.YAKIT_EDITION = 'irifyEE'
    expect(writeEngineBuildTypeFile()).toBe('full')
    process.env.YAKIT_EDITION = 'memfit'
    expect(writeEngineBuildTypeFile()).toBe('full')
  })

  it('defaults community Yakit legacy packs to slim when no download sidecar exists', () => {
    process.env.YAKIT_EDITION = 'yakit'
    process.env.YAKIT_LEGACY = 'true'
    expect(writeEngineBuildTypeFile({ platform: 'darwin', arch: 'arm64', isLegacy: true })).toBe('slim')
    expect(readType()).toBe('slim')
  })

  it('marks community Yakit full when the sidecar says the slim artifact was missing', () => {
    process.env.YAKIT_EDITION = 'yakit'
    fs.mkdirSync(path.join(cwd, 'bins'), { recursive: true })
    fs.writeFileSync(path.join(cwd, 'bins', 'engine-build-type.windows-legacy'), 'full')
    expect(writeEngineBuildTypeFile({ platform: 'win32', arch: 'x64', isLegacy: true })).toBe('full')
    expect(readType()).toBe('full')
  })

  it('keeps other editions on full even if a slim sidecar is present', () => {
    process.env.YAKIT_EDITION = 'yakitEE'
    fs.mkdirSync(path.join(cwd, 'bins'), { recursive: true })
    fs.writeFileSync(path.join(cwd, 'bins', 'engine-build-type.darwin.arm64'), 'slim')
    expect(writeEngineBuildTypeFile({ platform: 'darwin', arch: 'arm64' })).toBe('full')
    expect(readType()).toBe('full')
  })
})
