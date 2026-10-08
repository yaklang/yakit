const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

// Exercise the final disk image on a new inode, matching a drag-and-drop installation.
function installFromDmg(releaseDir, tempDir, run = execFileSync) {
  const images = fs.readdirSync(releaseDir).filter((name) => name.endsWith('.dmg'))
  if (images.length !== 1) throw new Error('Expected exactly one final Mac disk image, found ' + images.length)
  const mount = path.join(tempDir, 'dmg-mount')
  const installed = path.join(tempDir, 'installed')
  fs.mkdirSync(mount, { recursive: true })
  fs.mkdirSync(installed, { recursive: true })
  run('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, path.join(releaseDir, images[0])], {
    stdio: 'inherit',
    timeout: 120000,
  })
  let app
  try {
    const apps = fs
      .readdirSync(mount, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.endsWith('.app'))
    if (apps.length !== 1) throw new Error('Expected exactly one application in the disk image')
    app = path.join(installed, apps[0].name)
    // ditto preserves the framework symlinks and executable permissions in the bundle.
    run('ditto', [path.join(mount, apps[0].name), app], { stdio: 'inherit', timeout: 120000 })
  } finally {
    try {
      run('hdiutil', ['detach', mount], { stdio: 'inherit', timeout: 60000 })
    } catch (error) {
      run('hdiutil', ['detach', '-force', mount], { stdio: 'inherit', timeout: 60000 })
    }
  }
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=4', app], { stdio: 'inherit', timeout: 120000 })
  if (process.env.BUILD_SIGN === 'true') {
    run('spctl', ['--assess', '--type', 'execute', '--verbose=4', app], { stdio: 'inherit', timeout: 120000 })
    run('xcrun', ['stapler', 'validate', app], { stdio: 'inherit', timeout: 120000 })
  }
  console.log('Final DMG installation has a valid application signature: ' + path.basename(app))
  return app
}

module.exports = { installFromDmg }
