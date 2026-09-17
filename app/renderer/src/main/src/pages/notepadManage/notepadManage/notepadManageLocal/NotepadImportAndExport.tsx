import { ipc } from '@/services/ipc'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { NotepadExportProps, NotepadImportProps } from './NotepadManageLocalType'
import { randomString } from '@/utils/randomUtil'
import { yakitNotify } from '@/utils/notification'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { Progress } from 'antd'
import { type NoteFilter, onOpenLocalFileByPath } from '../utils'
import { FigmaIcon6480193584Outlined, FigmaIcon2017756Outlined } from '@yakit-libs/yakit-ui-icons/outline'

import { useMemoizedFn } from 'ahooks'
import moment from 'moment'
import { handleOpenFileSystemDialog, type OpenDialogOptions } from '@/utils/fileSystemDialog'

import styles from './NotepadImportAndExport.module.scss'
interface ImportNoteRequest {
  TargetPath: string
}
interface ImportNoteResponse {
  Percent: number
  Verbose: string
}

/**
 * @description 笔记本导入
 */
export const NotepadImport: React.FC<NotepadImportProps> = React.memo((props) => {
  const { onClose, onImportSuccessAfter, getContainer } = props

  const [percent, setPercent] = useState<number>(0)
  const [visible, setVisible] = useState<boolean>(false)

  const successRef = useRef<boolean>(true)

  const taskToken = useMemo(() => randomString(40), [])

  const controllerRef = useRef<AbortController>()
  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      successRef.current = false
      yakitNotify('error', '导入失败:' + error)
      onEnd()
    }
    const run = async () => {
      const data = await handleOpenFileSystemDialog({ title: '请选择文件', properties: ['openFile'] })
      if (controller.signal.aborted) return
      if (!data.filePaths.length) {
        successRef.current = false
        onEnd()
        return
      }
      setVisible(true)
      await ipc.openStream(
        'grpc',
        'ImportNote',
        { TargetPath: data.filePaths[0] },
        {
          token: taskToken,
          signal: controller.signal,
          onData(data) {
            if (!controller.signal.aborted) setPercent(Math.floor(data.Percent * 100))
          },
          onError,
          onEnd() {
            if (!controller.signal.aborted) onEnd()
          },
        },
      )
    }
    void run().catch(onError)
    return () => controller.abort()
  }, [])

  const onEnd = useMemoizedFn(() => {
    if (successRef.current) {
      onImportSuccessAfter()
    }
    onClose()
    setVisible(false)
    setPercent(0)
  })

  const stopImport = () => {
    successRef.current = false
    controllerRef.current?.abort()
    onEnd()
  }
  return (
    <YakitHint
      visible={visible}
      title="笔记本导入中"
      heardIcon={<FigmaIcon6480193584Outlined style={{ color: 'var(--Colors-Use-Warning-Primary)' }} />}
      onCancel={() => {
        stopImport()
      }}
      okButtonProps={{ style: { display: 'none' } }}
      isDrag={true}
      mask={false}
      getContainer={getContainer}
      wrapClassName={styles['notepadImportModal']}
    >
      <Progress
        strokeColor="var(--Colors-Use-Main-Primary)"
        trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
        percent={percent}
        format={(percent) => `已导入 ${percent}%`}
      />
    </YakitHint>
  )
})

interface ExportNoteRequest {
  Filter: NoteFilter
  TargetPath: string
}
interface ExportNoteResponse {
  Percent: number
  Verbose: string
}

export const NotepadExport: React.FC<NotepadExportProps> = React.memo((props) => {
  const { filter, onClose, getContainer } = props
  const [percent, setPercent] = useState<number>(0)
  const taskToken = useMemo(() => randomString(40), [])
  const [visible, setVisible] = useState<boolean>(false)

  const successRef = useRef<boolean>(true)
  const targetPathRef = useRef<string>('')

  const controllerRef = useRef<AbortController>()
  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      successRef.current = false
      yakitNotify('error', '导出失败:' + error)
      onEnd()
    }
    const run = async () => {
      const data = await handleOpenFileSystemDialog({ title: '请选择文件夹', properties: ['openDirectory'] })
      if (controller.signal.aborted) return
      if (!data.filePaths.length) {
        successRef.current = false
        onEnd()
        return
      }
      targetPathRef.current = await ipc.invoke('local', 'pathJoin', {
        dir: data.filePaths[0],
        file: `笔记本-${moment().valueOf()}.zip`,
      })
      if (controller.signal.aborted) return
      setVisible(true)
      await ipc.openStream(
        'grpc',
        'ExportNote',
        { TargetPath: targetPathRef.current, Filter: filter },
        {
          token: taskToken,
          signal: controller.signal,
          onData(data) {
            if (!controller.signal.aborted) setPercent(Math.floor(data.Percent * 100))
          },
          onError,
          onEnd() {
            if (!controller.signal.aborted) onEnd()
          },
        },
      )
    }
    void run().catch(onError)
    return () => controller.abort()
  }, [])

  const onEnd = useMemoizedFn(() => {
    if (successRef.current) {
      onOpenLocalFileByPath(targetPathRef.current)
    }
    onClose()
    setVisible(false)
    setPercent(0)
  })
  const stopExport = () => {
    successRef.current = false
    controllerRef.current?.abort()
    onEnd()
  }
  return (
    <YakitHint
      visible={visible}
      title="笔记本导出中"
      heardIcon={<FigmaIcon2017756Outlined style={{ color: 'var(--Colors-Use-Warning-Primary)' }} />}
      onCancel={() => {
        stopExport()
      }}
      okButtonProps={{ style: { display: 'none' } }}
      isDrag={true}
      mask={false}
      getContainer={getContainer}
      wrapClassName={styles['notepadExportModal']}
    >
      <Progress
        strokeColor="var(--Colors-Use-Main-Primary)"
        trailColor="var(--Colors-Use-Neutral-Bg)"
        percent={percent}
        format={(percent) => `已导出 ${percent}%`}
      />
    </YakitHint>
  )
})
