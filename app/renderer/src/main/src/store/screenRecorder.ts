import { ipc, type GrpcInput, type StreamTask } from '@/services/ipc'
import { yakitNotify } from '@/utils/notification'
/**
 * @description 记录录屏
 */

import { randomString } from '@/utils/randomUtil'
import { create } from 'zustand'

interface ScreenRecorderProps {
  screenRecorderInfo: ScreenRecorderInfoProps
  setRecording: (b: boolean) => void
  setScreenRecorderInfo: (v: ScreenRecorderInfoProps) => void
  getScreenRecorderInfo: () => void
}

interface ScreenRecorderInfoProps {
  isRecording: boolean
  token: string
}

export const useScreenRecorder = create<ScreenRecorderProps>((set, get) => ({
  screenRecorderInfo: {
    isRecording: false,
    token: randomString(40),
  },
  setRecording: (b: boolean) => {
    const s: ScreenRecorderInfoProps = get().screenRecorderInfo
    set({
      screenRecorderInfo: {
        ...s,
        isRecording: b,
      },
    })
  },
  setScreenRecorderInfo: (info) => set({ screenRecorderInfo: info }),
  getScreenRecorderInfo: () => get().screenRecorderInfo,
}))

// 录屏属于窗口会话，配置弹窗关闭后仍继续；顶层宿主卸载时结束。
let recordingGeneration = 0
let activeRecording: { controller: AbortController; token: string; task?: StreamTask<'StartScrecorder'> } | undefined

export async function startRecording(params: GrpcInput<'StartScrecorder'>, token: string) {
  const stopping = stopRecording()
  const generation = recordingGeneration
  await stopping
  if (generation !== recordingGeneration) return false
  const session = {
    controller: new AbortController(),
    token,
    task: undefined as StreamTask<'StartScrecorder'> | undefined,
  }
  activeRecording = session
  useScreenRecorder.getState().setRecording(true)
  const finish = (error?: unknown) => {
    if (activeRecording !== session || session.controller.signal.aborted) return
    activeRecording = undefined
    useScreenRecorder.getState().setRecording(false)
    if (error) yakitNotify('error', `录屏失败：${error}`)
  }
  try {
    session.task = await ipc.openStream('grpc', 'StartScrecorder', params, {
      token,
      signal: session.controller.signal,
      onError: finish,
      onEnd: () => finish(),
    })
    return activeRecording === session && !session.controller.signal.aborted
  } catch (error) {
    finish(error)
    return false
  }
}

export async function stopRecording(token?: string) {
  const session = activeRecording
  if (token && session && session.token !== token) return
  recordingGeneration += 1
  activeRecording = undefined
  useScreenRecorder.getState().setRecording(false)
  // 先关闭本地回调；取消仍由同一个任务实例发送给主进程。
  session?.controller.abort()
  await session?.task?.cancel()
}
