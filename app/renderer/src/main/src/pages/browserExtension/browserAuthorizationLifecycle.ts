export type BrowserAuthorizationWorkspaceLifecycleReason =
  | 'expired'
  | 'evicted'
  | 'engine_instance_changed'
  | 'not_found'
  | 'replaced'

export interface BrowserAuthorizationWorkspaceLifecycleDetails {
  reason: BrowserAuthorizationWorkspaceLifecycleReason
  workspaceId: string
  engineInstanceId: string
  expiresAt?: number
  replacementWorkspaceId?: string
}

export class BrowserAuthorizationWorkspaceLifecycleError extends Error {
  constructor(public readonly details: BrowserAuthorizationWorkspaceLifecycleDetails) {
    const messages: Record<BrowserAuthorizationWorkspaceLifecycleReason, string> = {
      expired: '授权工作区已自然过期，请重新建立 A/B 身份工作区。',
      evicted: '授权工作区因引擎内存容量达到上限而被淘汰，请重新建立。',
      engine_instance_changed: 'Yak 引擎已经重启，旧工作区不可跨进程恢复，请重新建立。',
      not_found: '授权工作区在当前引擎中不存在，请重新建立。',
      replaced: details.replacementWorkspaceId
        ? '授权工作区已被同一组身份的新工作区替换，请重新载入。'
        : '授权工作区已被更新的工作区替换，请重新建立。',
    }
    super(messages[details.reason])
    this.name = 'BrowserAuthorizationWorkspaceLifecycleError'
  }
}

export function browserAuthorizationLifecycleError(data: Uint8Array | undefined, fallbackMessage: string): Error {
  if (data?.length) {
    try {
      const value = JSON.parse(new TextDecoder().decode(data)) as Partial<BrowserAuthorizationWorkspaceLifecycleDetails>
      if (
        ['expired', 'evicted', 'engine_instance_changed', 'not_found', 'replaced'].includes(value.reason || '') &&
        typeof value.workspaceId === 'string' &&
        typeof value.engineInstanceId === 'string'
      ) {
        return new BrowserAuthorizationWorkspaceLifecycleError(value as BrowserAuthorizationWorkspaceLifecycleDetails)
      }
    } catch {
      // Non-lifecycle diagnostics remain ordinary task errors.
    }
  }
  return new Error(fallbackMessage)
}
