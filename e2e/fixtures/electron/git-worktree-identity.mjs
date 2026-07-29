import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const getGitWorktreeIdentity = async (directory) => {
  const [{ stdout: head }, { stdout: status }, { stdout: diff }, { stdout: untrackedOutput }] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: directory, maxBuffer: 1024 * 1024 }),
    execFileAsync('git', ['status', '--porcelain', '--untracked-files=normal'], {
      cwd: directory,
      maxBuffer: 4 * 1024 * 1024,
    }),
    execFileAsync('git', ['diff', '--binary', 'HEAD'], { cwd: directory, maxBuffer: 64 * 1024 * 1024 }),
    execFileAsync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
      cwd: directory,
      encoding: 'buffer',
      maxBuffer: 16 * 1024 * 1024,
    }),
  ])
  const hash = createHash('sha256').update(head.trim()).update(diff)
  const untracked = untrackedOutput.toString('utf8').split('\0').filter(Boolean).sort()
  for (const relativePath of untracked) {
    hash.update(relativePath)
    hash.update(await readFile(path.join(directory, relativePath)))
  }
  return {
    head: head.trim(),
    dirty: status.trim().length > 0,
    stateFingerprint: hash.digest('hex'),
  }
}
