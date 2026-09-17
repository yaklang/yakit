import { ipc } from '@/services/ipc'
import { randomString } from '@/utils/randomUtil'
export const outputToWelcomeConsole = (msg: any) => {
  ipc
    .invoke('local', 'output-log-to-welcome-console', `${msg}`)
    .then(() => {})
    .catch((e) => {
      console.info(e)
    })
}

export const getRandomLocalEnginePort = (callback: (port: number) => any) => {
  ipc
    .invoke('local', 'get-random-local-engine-port', {})
    .then((port: number) => {
      callback(port)
    })
    .catch((e) => {
      console.info(e)
    })
}

export const isEngineConnectionAlive = () => {
  const text = randomString(30)
  return ipc.invoke('grpc', 'Echo', { text }).then((res: { result: string }) => {
    if (res.result !== text) {
      throw Error(`Engine dead`)
    }
    return true
  })
}
