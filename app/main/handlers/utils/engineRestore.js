const fs = require('fs/promises')
const path = require('path')
const StreamZip = require('node-stream-zip')

async function restoreBuiltinEngine({
  zipPath,
  target,
  entry,
  writeConfig,
  openArchive = (file) => new StreamZip.async({ file }),
}) {
  // Extract before changing the installed executable. Keep the previous file recoverable.
  const directory = await fs.mkdtemp(path.join(path.dirname(target), '.yakit-restore-'))
  const candidate = path.join(directory, 'candidate')
  const backup = path.join(directory, 'previous')
  let saved = false
  let installed = false
  let retain = false
  try {
    const archive = openArchive(zipPath)
    try {
      await archive.extract(entry, candidate)
    } finally {
      await archive.close()
    }
    if (!(await fs.stat(candidate)).isFile() || !(await fs.stat(candidate)).size)
      throw new Error('Bundled engine extraction failed')
    if (process.platform !== 'win32') await fs.chmod(candidate, 0o755)
    try {
      await fs.rename(target, backup)
      saved = true
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    await fs.rename(candidate, target)
    installed = true
    await writeConfig()
  } catch (error) {
    try {
      if (installed) await fs.unlink(target)
      if (saved) await fs.rename(backup, target)
    } catch {
      retain = true
      throw new Error(`Restore failed; previous engine retained at ${backup}`)
    }
    throw error
  } finally {
    // This directory was created by this operation inside the engine directory.
    if (!retain) await fs.rm(directory, { recursive: true, force: true })
  }
}

module.exports = { restoreBuiltinEngine }
