import FS from 'node:fs'

/**
 * Write renderer export data without converting binary payloads to text.
 * Node's fs.writeFile accepts both strings and Uint8Array instances.
 */
const writeFileData = (route: string, data: string | Uint8Array) =>
  new Promise<string>((resolve, reject) => {
    FS.writeFile(route, data, (err) => {
      if (err) reject(err)
      else resolve('success')
    })
  })

export { writeFileData }
