const FS = require('fs')

/**
 * Write renderer export data without converting binary payloads to text.
 * Node's fs.writeFile accepts both strings and Uint8Array instances.
 */
const writeFileData = (route, data) =>
  new Promise((resolve, reject) => {
    FS.writeFile(route, data, (err) => {
      if (err) reject(err)
      else resolve('success')
    })
  })

module.exports = { writeFileData }
