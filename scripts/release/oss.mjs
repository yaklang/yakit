import { createHmac, createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { run } from './io.mjs'

export function ossAuthorization({ keyId, keySecret, object, md5, date }) {
  const canonical = `PUT\n${md5}\napplication/octet-stream\n${date}\n/yaklang/${object}`
  const signature = createHmac('sha1', keySecret).update(canonical).digest('base64')
  return `OSS ${keyId}:${signature}`
}

// Stream directly from each packaging runner to the existing bucket, without an SDK
// install or a second job downloading every platform's installers. OSS checks Content-MD5.
export async function uploadOss(file, object) {
  const { OSS_KEY_ID: keyId, OSS_KEY_SECRET: keySecret } = process.env
  if (!keyId || !keySecret) throw new Error('Missing OSS publishing credentials')
  const hash = createHash('md5')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  const md5 = hash.digest('base64')
  const date = new Date().toUTCString()
  await mkdir('.release', { recursive: true })
  const temporary = await mkdtemp('.release/oss-')
  const headers = path.join(temporary, 'headers')
  await writeFile(
    headers,
    `Date: ${date}\nContent-Type: application/octet-stream\nContent-MD5: ${md5}\nAuthorization: ${ossAuthorization({ keyId, keySecret, object, md5, date })}\n`,
    { mode: 0o600 },
  )
  try {
    await run(process.platform === 'win32' ? 'curl.exe' : 'curl', [
      '--fail',
      '--silent',
      '--show-error',
      '--retry',
      '3',
      '--retry-delay',
      '1',
      '--retry-max-time',
      '900',
      '--connect-timeout',
      '15',
      '--max-time',
      '900',
      '--upload-file',
      file,
      '--header',
      `@${headers}`,
      `https://yaklang.oss-accelerate.aliyuncs.com/${object}`,
    ])
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}
