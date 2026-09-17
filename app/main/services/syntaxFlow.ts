import type { BrowserWindow } from 'electron'
import type { YakClient } from '../../shared/generated/grpc/types'

import fs from 'node:fs'
import path from 'node:path'
const { getYakProjects } = require('../filePath')

export function exportSyntaxFlowsStream(getClient: () => YakClient): import('../ipc/streams').StreamFactory {
  return {
    requestStream: false,
    responseStream: true,
    pauseable: true,
    create(params) {
      if (
        !params ||
        typeof params !== 'object' ||
        !('TargetPath' in params) ||
        typeof params.TargetPath !== 'string' ||
        !params.TargetPath
      )
        throw new Error('TargetPath is required')
      fs.mkdirSync(getYakProjects(), { recursive: true })
      return getClient().ExportSyntaxFlows({ ...params, TargetPath: path.join(getYakProjects(), params.TargetPath) })
    },
  }
}
