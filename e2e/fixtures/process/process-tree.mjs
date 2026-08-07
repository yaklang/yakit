import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const treeKill = require('tree-kill')

/** Terminate a spawned command and all descendants; cleanup callers may ignore an already-exited tree. */
export const terminateProcessTree = (pid, signal = 'SIGTERM', implementation = treeKill) =>
  new Promise((resolve) => {
    if (!Number.isInteger(pid) || pid <= 0) {
      resolve(false)
      return
    }
    implementation(pid, signal, (error) => resolve(!error))
  })
