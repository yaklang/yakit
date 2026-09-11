import type { AIChatSendParams } from '@/pages/ai-re-act/hooks/type'
import type { ChatListRenderType } from '@/pages/ai-re-act/hooks/aiRender'

const { ipcRenderer } = window.require('electron')

const INTERACTIVE_ACTION = 'ai-concurrent-stream-interactive-action'

export interface SendInteractiveActionParams {
  session: string
  chatType: ChatListRenderType
  params: AIChatSendParams['params']
}

/**
 * 子窗口转发交互动作（如工具卡"跳过长时间加载"）到主窗口会话。
 * 子窗口没有自己的 gRPC 流与会话控制器，交互消息必须由主窗口代发；
 * 主进程做 requestId 中转，主窗口应答后回执 success/message。
 */
export async function sendConcurrentStreamInteractiveAction(payload: SendInteractiveActionParams): Promise<
  | {
      success: boolean
      message?: string
    }
  | undefined
> {
  try {
    return await ipcRenderer.invoke(INTERACTIVE_ACTION, payload)
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}
