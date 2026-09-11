/** 一次连接的身份与异步收尾记录；重连创建新对象，旧任务始终持有旧对象。 */
export class SessionLifecycle {
  /** 本次连接是否有效 */
  current = true
  /** 只控制新写任务入队；关闭后已入队的事务仍需完成。 */
  writable = true
  /** 关闭开始后禁止建联回调、主动发消息和轮询继续执行。 */
  closing = false
  /** 是否已经发起 IPC start，区分清理准备阶段与真实连接。 */
  started = false
  /** 当前连接按接收顺序处理事件的链尾，end 等待它后才刷最终快照。 */
  events: Promise<void> = Promise.resolve()
  /** 建联前清理任务；结束及删除必须等它退出，避免迟到清理影响下一轮。 */
  preparation: Promise<void> = Promise.resolve()
  /** 同一次收尾只执行一次，重复 end / dispose 共享结果。 */
  ending?: Promise<void>
  /** 保存首次处理或持久化失败，供历史恢复及关闭判断是否真正保存成功。 */
  error?: unknown
}
