/**
 * Yakit 下载任务跟踪：按 IPC sender 隔离任务槽位与目标路径。
 *
 * 取消语义：dest 已知（下载流已建立）时，cancel 走 writersByDest 精确销毁；
 * dest 未知（仍在解析 download-url 的窗口期）时，cancel 置 task.cancelRequested，
 * 由 asyncDownloadLatestYakit 在 await 恢复点消费——两条路径对渲染端同样 reject
 * 'Write operation stoped'，避免「取消按钮在 URL 解析窗口内静默失效」。
 */
function createYakitDownloadTracker() {
  const tasks = new Map()
  return {
    start(event) {
      if (tasks.has(event.sender.id)) return
      const task = { dest: undefined, cancelRequested: false }
      tasks.set(event.sender.id, task)
      return task
    },
    setDest(event, task, dest) {
      if (tasks.get(event.sender.id) === task) task.dest = dest
    },
    clear(event, task) {
      if (tasks.get(event.sender.id) === task) tasks.delete(event.sender.id)
    },
    getDest(event) {
      const task = tasks.get(event.sender.id)
      return task ? task.dest : undefined
    },
    /** 窗口期取消：置标志，由下载 wrapper 在 await 恢复点检查并中止 */
    requestCancel(event) {
      const task = tasks.get(event.sender.id)
      if (!task) return false
      task.cancelRequested = true
      return true
    },
    isCancelRequested(event, task) {
      return !!task && task.cancelRequested === true && tasks.get(event.sender.id) === task
    },
  }
}

module.exports = { createYakitDownloadTracker }
