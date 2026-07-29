const childProcess = require('child_process')
const { getLocalYaklangEngine } = require('../filePath')
const { psYakList } = require('../handlers/yakLocal')
const { killYakGRPC } = require('../handlers/yakLocal')
const isWindows = process.platform === 'win32'
// 当前服务ppid
let ppid = null

const asyncKillDynamicControl = () => {
  return new Promise(async (resolve, reject) => {
    if (ppid) {
      const yakList = await psYakList()
      const processItem = yakList.find((element) => {
        if (isWindows) {
          return element.ppid === ppid
        } else {
          return element.pid === ppid
        }
      })
      if (processItem) {
        killYakGRPC(processItem.pid)
          .then(() => {
            ppid = null
            console.log('colse-colse-colse-colse-colse-')
          })
          .finally(() => {
            resolve()
          })
      } else {
        resolve()
      }
    } else {
      resolve()
    }
  })
}

const asyncStartDynamicControl = (win, params) => {
  // 如果已启用服务 则跳过启用服务 若10S内未获取到密钥则杀掉进程重启
  if (ppid) {
    return new Promise((resolve, reject) => resolve({ alive: true }))
  }
  const { note, secret, server, gen_tls_crt } = params
  return new Promise((resolve, reject) => {
    try {
      let settled = false
      const subprocess = childProcess.spawn(
        getLocalYaklangEngine(),
        [
          'xgrpc',
          '--server',
          `${server}`,
          '--gen-tls-crt',
          `${gen_tls_crt}`,
          '--secret',
          `${secret}`,
          '--note',
          `${note}`,
        ],
        {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )

      const timeoutId = setTimeout(() => {
        if (settled) return
        settled = true
        ppid = null
        try {
          subprocess.kill()
        } catch (e) {}
        reject(new Error('启动动态控制超时（30s内未收到 yak grpc ok）'))
      }, 30000)

      subprocess.stdout.on('data', (stdout) => {
        const output = stdout.toString('utf-8')
        console.log('start-data', output)
        if (output.includes('yak grpc ok')) {
          if (settled) return
          settled = true
          clearTimeout(timeoutId)
          // 当前启用服务id
          ppid = subprocess.pid
          setTimeout(() => {
            resolve({ alive: false })
          }, 1000)
        }
      })
      subprocess.on('error', (err) => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        if (err) {
          ppid = null
          reject(err)
        }
      })

      subprocess.on('close', (e) => {
        ppid = null
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        if (e) reject(e)
      })
    } catch (e) {
      reject(e)
    }
  })
}

const asyncAliveDynamicControlStatus = () => {
  return new Promise((resolve, reject) => resolve(!!ppid))
}

module.exports = {
  asyncKillDynamicControl,
  asyncStartDynamicControl,
  asyncAliveDynamicControlStatus,
}
