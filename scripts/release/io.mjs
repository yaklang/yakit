import { spawn } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'

export function run(command, args, { capture = false, label = command, ...options } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      windowsHide: true,
      ...options,
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => (stdout += chunk))
    child.stderr?.on('data', (chunk) => (stderr += chunk))
    child.once('error', (error) => {
      error.message = `${label}: ${error.message}`
      reject(error)
    })
    child.once('close', (code, signal) => {
      if (code === 0) resolve(stdout.trim())
      else reject(Object.assign(new Error(`${label} failed (${signal || code}): ${stderr}`), { code, stdout }))
    })
  })
}

// A tar envelope retains macOS framework symlinks and executable permissions.
// Gzip level 1 keeps the critical path short; Actions must not compress it again.
export async function archive(directory, destination) {
  await mkdir(path.dirname(destination), { recursive: true })
  const child = spawn('tar', ['-cf', '-', '-C', directory, '.'], { stdio: ['ignore', 'pipe', 'inherit'] })
  const completed = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`tar failed (${code})`))))
  })
  try {
    await Promise.all([pipeline(child.stdout, createGzip({ level: 1 }), createWriteStream(destination)), completed])
  } catch (error) {
    child.kill()
    await rm(destination, { force: true })
    throw error
  }
}

export async function extract(file, directory) {
  await mkdir(directory, { recursive: true })
  await run('tar', ['-xzf', file, '-C', directory])
}

export async function download(url, destination, { optional = false } = {}) {
  await mkdir(path.dirname(destination), { recursive: true })
  try {
    await run(
      process.platform === 'win32' ? 'curl.exe' : 'curl',
      [
        '--fail',
        '--location',
        '--proto',
        '=https',
        '--proto-redir',
        '=https',
        '--silent',
        '--show-error',
        '--retry',
        '3',
        '--retry-delay',
        '1',
        '--retry-max-time',
        '300',
        '--connect-timeout',
        '15',
        '--max-time',
        '300',
        '--output',
        destination,
        '--write-out',
        '%{http_code}',
        url,
      ],
      { capture: true },
    )
    return true
  } catch (error) {
    await rm(destination, { force: true })
    // Authentication failures, timeouts and server errors must not silently turn a slim release into full.
    if (optional && error.code === 22 && error.stdout === '404') return false
    throw error
  }
}

export async function hashFile(file) {
  const { createHash } = await import('node:crypto')
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
