function createYakitDownloadTracker() {
  const tasks = new Map()
  return {
    start(event) {
      if (tasks.has(event.sender.id)) return
      const task = { dest: undefined, cancelRequested: false }
      tasks.set(event.sender.id, task)
      return task
    },
    requestCancel(event) {
      const task = tasks.get(event.sender.id)
      if (!task) return undefined
      task.cancelRequested = true
      return task.dest
    },
    setDest(event, task, dest) {
      if (tasks.get(event.sender.id) !== task) return
      task.dest = dest
      if (task.cancelRequested && dest) {
        // Lazy require avoids circular init with requestWithProgress consumers
        const { markCancelRequested } = require('./requestWithProgress')
        markCancelRequested(dest)
      }
    },
    isCancelRequested(event, task) {
      return tasks.get(event.sender.id) === task && !!task.cancelRequested
    },
    clear(event, task) {
      if (tasks.get(event.sender.id) === task) tasks.delete(event.sender.id)
    },
    getDest(event) {
      const task = tasks.get(event.sender.id)
      return task ? task.dest : undefined
    },
  }
}

module.exports = { createYakitDownloadTracker }
