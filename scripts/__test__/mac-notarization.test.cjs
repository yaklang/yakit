const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { notarizeWithRetry, isRetryableStapleError } = require('../mac-notarization')

const appPath = '/Users/runner/work/AI Senso/release/mac/AI Senso.app'
const options = {
  appPath,
  appleId: 'build@example.test',
  appleIdPassword: 'test-password-not-to-be-logged',
  teamId: 'TESTTEAM',
}
const networkOutput = 'NSURLErrorDomain Code=-1005 "The network connection was lost."'
const initialStapleError = (output = networkOutput, code = 68) =>
  new Error(`Failed to staple your application with code: ${code}\n\n${output}`)
const commandStapleError = (output = networkOutput, code = 68) =>
  Object.assign(new Error('Command failed: xcrun stapler staple'), { code, stderr: output })

function harness({ notarizeError, stapleErrors = [], validateError } = {}) {
  const calls = []
  const delays = []
  const messages = []
  let uploads = 0
  let stapleAttempts = 0
  const dependencies = {
    notarize: async (input) => {
      uploads++
      assert.equal(input, options)
      if (notarizeError) throw notarizeError
    },
    run: async (command, args, executionOptions) => {
      calls.push({ command, args: [...args], options: executionOptions })
      assert.equal(command, 'xcrun')
      assert.equal(executionOptions.timeout, 60000)
      assert.equal(executionOptions.encoding, 'utf8')
      assert.ok(Number.isFinite(executionOptions.maxBuffer) && executionOptions.maxBuffer > 0)
      assert.notEqual(executionOptions.shell, true)
      if (args[1] === 'staple') {
        assert.deepEqual(args, ['stapler', 'staple', '-v', appPath])
        const error = stapleErrors[stapleAttempts++]
        if (error) throw error
      } else {
        assert.deepEqual(args, ['stapler', 'validate', '-v', appPath])
        if (validateError) throw validateError
      }
      return { stdout: 'The action worked!', stderr: '' }
    },
    wait: async (ms) => {
      delays.push(ms)
    },
    log: (message) => {
      messages.push(String(message))
    },
  }
  return { dependencies, calls, delays, messages, uploads: () => uploads }
}

test('staple retry classifier requires both the staple failure and explicit network evidence', () => {
  assert.equal(isRetryableStapleError(initialStapleError()), true)
  assert.equal(isRetryableStapleError(initialStapleError('The network connection was lost.')), true)
  assert.equal(isRetryableStapleError(commandStapleError()), true)
  assert.equal(isRetryableStapleError(initialStapleError('Could not validate ticket')), false)
  assert.equal(isRetryableStapleError(commandStapleError('Could not validate ticket')), false)
  assert.equal(isRetryableStapleError(initialStapleError(networkOutput, 65)), false)
  assert.equal(isRetryableStapleError(commandStapleError(networkOutput, 65)), false)
  assert.equal(isRetryableStapleError(new Error(`Failed to notarize via notarytool\n${networkOutput}`)), false)
  assert.equal(isRetryableStapleError(new Error(`Authentication failed\n${networkOutput}`)), false)
  assert.equal(isRetryableStapleError(null), false)
})

test('successful notarization validates once without a second upload or staple', async () => {
  const h = harness()
  await notarizeWithRetry(options, h.dependencies)
  assert.equal(h.uploads(), 1)
  assert.deepEqual(
    h.calls.map(({ args }) => args[1]),
    ['validate'],
  )
  assert.deepEqual(h.delays, [])
})

test('the logged CloudKit error retries only stapling the same app, then validates it', async () => {
  const error = initialStapleError(`Error fetching ticket from api.apple-cloudkit.com/records/lookup\n${networkOutput}`)
  const h = harness({ notarizeError: error, stapleErrors: [commandStapleError()] })
  await notarizeWithRetry(options, h.dependencies)
  assert.equal(h.uploads(), 1)
  assert.deepEqual(
    h.calls.map(({ args }) => args[1]),
    ['staple', 'staple', 'validate'],
  )
  assert.deepEqual(h.delays, [15000, 30000])
  assert.equal(h.messages.join('\n').includes(options.appleIdPassword), false)
})

test('persistent network failure stops after five total staple attempts without validation', async () => {
  const h = harness({
    notarizeError: initialStapleError(),
    stapleErrors: Array.from({ length: 4 }, () => commandStapleError()),
  })
  await assert.rejects(notarizeWithRetry(options, h.dependencies), /network connection was lost/)
  assert.equal(h.uploads(), 1)
  assert.equal(h.calls.length, 4)
  assert.ok(h.calls.every(({ args }) => args[1] === 'staple'))
  assert.deepEqual(h.delays, [15000, 30000, 60000, 120000])
})

test('permanent errors from initial notarization propagate without retrying or validating', async (t) => {
  const errors = [
    ['non-network staple code 68', initialStapleError('Could not validate ticket')],
    ['different staple exit code', initialStapleError(networkOutput, 65)],
    ['invalid credentials', new Error('Failed to notarize via notarytool: HTTP status code 401. Invalid credentials.')],
    ['Apple rejection', new Error('Failed to notarize via notarytool: status Invalid; invalid code signature')],
    ['upload network failure', new Error(`Failed to notarize via notarytool\n${networkOutput}`)],
    ['upload subprocess code 68 without confirmed staple stage', commandStapleError()],
  ]
  for (const [name, error] of errors) {
    await t.test(name, async () => {
      const h = harness({ notarizeError: error })
      await assert.rejects(notarizeWithRetry(options, h.dependencies), (actual) => actual === error)
      assert.equal(h.uploads(), 1)
      assert.deepEqual(h.calls, [])
      assert.deepEqual(h.delays, [])
    })
  }
})

test('a permanent staple failure encountered during recovery stops further retries', async () => {
  const permanentError = commandStapleError('Could not validate ticket', 68)
  const h = harness({ notarizeError: initialStapleError(), stapleErrors: [commandStapleError(), permanentError] })
  await assert.rejects(notarizeWithRetry(options, h.dependencies), (actual) => actual === permanentError)
  assert.equal(h.uploads(), 1)
  assert.deepEqual(
    h.calls.map(({ args }) => args[1]),
    ['staple', 'staple'],
  )
  assert.deepEqual(h.delays, [15000, 30000])
})

test('ticket validation failure propagates once even when its error resembles a retryable network error', async (t) => {
  for (const initialError of [undefined, initialStapleError()]) {
    await t.test(initialError ? 'after recovering staple' : 'after normal notarization', async () => {
      const validationError = commandStapleError()
      const h = harness({ notarizeError: initialError, validateError: validationError })
      await assert.rejects(notarizeWithRetry(options, h.dependencies), (actual) => actual === validationError)
      assert.equal(h.uploads(), 1)
      assert.deepEqual(
        h.calls.map(({ args }) => args[1]),
        initialError ? ['staple', 'validate'] : ['validate'],
      )
      assert.deepEqual(h.delays, initialError ? [15000] : [])
    })
  }
})

test('signed builds with complete credentials keep only the afterSign notarization entry point', () => {
  const previous = { ...process.env }
  const configPath = require.resolve('../../packageScript/electron-builder.config')
  try {
    Object.assign(process.env, {
      PLATFORM: 'memfit',
      BUILD_SIGN: 'true',
      CSC_IDENTITY_AUTO_DISCOVERY: 'true',
      APPLE_ID: options.appleId,
      APPLE_APP_SPECIFIC_PASSWORD: options.appleIdPassword,
      APPLE_TEAM_ID: options.teamId,
      CERT_BASE64: 'test-certificate',
      CERT_PASSWORD: 'test-certificate-password',
    })
    delete require.cache[configPath]
    const config = require(configPath)
    assert.equal(config.mac.notarize, false)
    assert.equal(config.mac.hardenedRuntime, true)
    assert.equal(config.afterSign, 'packageScript/buildHook/after-sign.js')
  } finally {
    process.env = previous
    delete require.cache[configPath]
  }
})

test('native Mac signing requires credentials and registers recovery even without auto-discovery', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../packageScript/electron-builder.config.js'), 'utf8')
  const evaluate = (env) => {
    const context = { process: { env, platform: 'darwin', arch: 'x64' }, module: { exports: {} } }
    vm.runInNewContext(source, context)
    return context.module.exports
  }
  assert.throws(() => evaluate({ BUILD_SIGN: 'true' }), /require Apple signing and notarization credentials/)
  const config = evaluate({
    BUILD_SIGN: 'true',
    APPLE_ID: options.appleId,
    APPLE_APP_SPECIFIC_PASSWORD: options.appleIdPassword,
    APPLE_TEAM_ID: options.teamId,
    CERT_BASE64: 'test-certificate',
    CERT_PASSWORD: 'test-certificate-password',
  })
  assert.equal(config.forceCodeSigning, true)
  assert.equal(config.mac.notarize, false)
  assert.equal(config.mac.hardenedRuntime, true)
  assert.equal(config.afterSign, 'packageScript/buildHook/after-sign.js')
})

test('the packaging hook forwards credentials and an absolute app path to recovery only on Mac', async () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../packageScript/buildHook/after-sign.js'), 'utf8')
  const calls = []
  const env = {
    APPLE_ID: options.appleId,
    APPLE_APP_SPECIFIC_PASSWORD: options.appleIdPassword,
    APPLE_TEAM_ID: options.teamId,
  }
  const context = {
    process: { env },
    module: { exports: {} },
    console: { log: () => {} },
    require: (request) => {
      if (request === 'path') return path
      assert.equal(request, '../../scripts/mac-notarization')
      return { notarizeWithRetry: async (input) => calls.push(input) }
    },
  }
  vm.runInNewContext(source, context)
  const hook = context.module.exports
  const packContext = {
    appOutDir: 'release/mac',
    packager: { appInfo: { productFilename: 'AI Senso', id: 'com.aisenso.desktop' } },
    electronPlatformName: 'win32',
  }
  await hook(packContext)
  assert.equal(calls.length, 0)
  packContext.electronPlatformName = 'darwin'
  await hook(packContext)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].appPath, path.resolve(packContext.appOutDir, 'AI Senso.app'))
  assert.equal(calls[0].appleIdPassword, options.appleIdPassword)
  delete env.APPLE_APP_SPECIFIC_PASSWORD
  await assert.rejects(hook(packContext), /Missing required notarization env vars: APPLE_APP_SPECIFIC_PASSWORD/)
  assert.equal(calls.length, 1)
})
