import { ipc } from '@/services/ipc'

/** 文件读取的取消仅作用于当前调用，不使用全局取消通道。 */
export const getCodeByPath = (path: string, loadTreeType?: 'file' | 'audit', signal?: AbortSignal): Promise<string> => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const decoder = new TextDecoder()
    let content = ''
    let settled = false
    const clean = () => signal?.removeEventListener('abort', abort)
    const abort = () => {
      if (settled) return
      settled = true
      clean()
      controller.abort()
      reject(Object.assign(new Error('File read aborted'), { code: 'ABORTED' }))
    }
    const finish = () => {
      if (settled) return
      settled = true
      clean()
      content += decoder.decode()
      controller.abort()
      resolve(content)
    }
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      clean()
      controller.abort()
      if (signal?.aborted || loadTreeType === 'audit') {
        reject(error)
        return
      }
      // 审计虚拟文件系统不能回退到主机上的同名文件。
      void ipc.invoke('local', 'read-file-content', path, { signal }).then(resolve, reject)
    }
    if (signal?.aborted) {
      abort()
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    try {
      void ipc
        .openStream(
          'grpc',
          'ReadFile',
          {
            FilePath: path,
            FileSystem: loadTreeType === 'audit' ? 'ssadb' : 'local',
          },
          {
            signal: controller.signal,
            onData(result) {
              if (settled) return
              content += decoder.decode(result.Data, { stream: true })
              if (result.EOF) finish()
            },
            onError: fail,
            onEnd: finish,
          },
        )
        .catch(fail)
    } catch (error) {
      fail(error)
    }
  })
}
