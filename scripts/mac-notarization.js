const { execFile } = require('child_process')
const { promisify } = require('util')

const runCommand = promisify(execFile)
const retryDelays = [15000, 30000, 60000, 120000]
const commandOptions = { encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024, windowsHide: true }

function stapleErrorOutput(error) {
  return [error?.message, error?.stdout, error?.stderr].filter(Boolean).join('\n')
}

function isNotarizeStapleError(error) {
  return /^Failed to staple your application with code:\s*68\b/.test(error?.message || '')
}

function isRetryableStapleError(error) {
  const fromNotarize = isNotarizeStapleError(error)
  const fromStapler = error?.code === 68
  const networkError =
    /NSURLErrorDomain\s+Code=-(?:1001|1003|1004|1005|1006|1009)\b|The network connection was lost\b|The request timed out\b/i
  return (fromNotarize || fromStapler) && networkError.test(stapleErrorOutput(error))
}

async function notarizeWithRetry(options, dependencies = {}) {
  const notarize = dependencies.notarize || require('@electron/notarize').notarize
  const run = dependencies.run || runCommand
  const wait = dependencies.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const log = dependencies.log || console.log
  const appPath = options.appPath

  try {
    // notarize() uploads, waits for Apple to accept the application, then staples once.
    await notarize(options)
  } catch (error) {
    // Recover only a confirmed staple network failure after Apple's acceptance.
    // Signature, credentials and rejected submissions must retain their original failure.
    if (!isNotarizeStapleError(error) || !isRetryableStapleError(error)) throw error

    let lastError = error
    for (let index = 0; index < retryDelays.length; index++) {
      const attempt = index + 2
      const delay = retryDelays[index]
      log(`Staple attempt ${attempt - 1}/5 failed with a network error; retrying in ${delay / 1000}s.`)
      log(stapleErrorOutput(lastError))
      await wait(delay)
      log(`Staple attempt ${attempt}/5: ${appPath}`)
      try {
        // Retry the same accepted, signed application; do not resubmit or re-sign it.
        await run('xcrun', ['stapler', 'staple', '-v', appPath], commandOptions)
        lastError = null
        break
      } catch (retryError) {
        if (!isRetryableStapleError(retryError)) throw retryError
        lastError = retryError
      }
    }
    if (lastError) {
      throw new Error(`Failed to staple application after 5 attempts:\n${stapleErrorOutput(lastError)}`, {
        cause: lastError,
      })
    }
  }

  // Validate on both the normal path and the recovery path. Never release without a valid ticket.
  await run('xcrun', ['stapler', 'validate', '-v', appPath], commandOptions)
  log(`Notarization ticket validated: ${appPath}`)
}

module.exports = { notarizeWithRetry, isRetryableStapleError }
