function createYakitDownloadTracker() {
  const tasks = new Map()
  return {
    start(event) {
      if (tasks.has(event.sender.id)) return
      const task = { dest: undefined }
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
  }
}

module.exports = { createYakitDownloadTracker }
