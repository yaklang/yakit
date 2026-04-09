import { randomString } from '@/utils/randomUtil'
import { yakitEngine } from '@/services/electronBridge'

export const outputToWelcomeConsole = (msg: any) => {
  yakitEngine
    .outputLogToWelcomeConsole(`${msg}`)
    .then(() => {})
    .catch((e) => {
      console.info(e)
    })
}

export const getRandomLocalEnginePort = (callback: (port: number) => any) => {
  yakitEngine
    .getRandomLocalEnginePort()
    .then((port: number) => {
      callback(port)
    })
    .catch((e) => {
      console.info(e)
    })
}

export const isEngineConnectionAlive = () => {
  const text = randomString(30)
  return yakitEngine.echo({ text }).then((res: { result: string }) => {
    if (res.result !== text) {
      throw Error(`Engine dead`)
    }
    return true
  })
}
