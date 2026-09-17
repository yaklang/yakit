import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useGetState, useMemoizedFn, useUpdateEffect, useVirtualList } from 'ahooks'
import YakitXterm from '@/components/yakitUI/YakitXterm/YakitXterm'
import { TerminalOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import classNames from 'classnames'
import styles from './TerminalBox.module.scss'
import { v4 as uuidv4 } from 'uuid'
import { failed } from '@/utils/notification'
import { writeExecResultXTerm, writeXTerm, xtermClear } from '@/utils/xtermUtils'
import { Uint8ArrayToString } from '@/utils/str'
import type { ExecResult } from '@/pages/invoker/schema'
import type { TerminalDetailsProps } from './TerminalMap'
import { ipc, type GrpcInput, type StreamTask } from '@/services/ipc'
export const defaultTerminaFont = "Consolas, 'Courier New', monospace"

export const defaultTerminalFont = {
  fontFamily: "Consolas, 'Courier New', monospace",
  fontSize: 14,
}

export interface DefaultTerminaSettingProps {
  fontFamily: string
  fontSize: number
}

export interface TerminalBoxProps {
  xtermRef: React.MutableRefObject<any>
  commandExec?: (v: string) => void
  onChangeSize?: (v: { row: number; col: number }) => void
  defaultTerminalSetting?: DefaultTerminaSettingProps
}
export const TerminalBox: React.FC<TerminalBoxProps> = (props) => {
  const { xtermRef, commandExec, onChangeSize, defaultTerminalSetting = defaultTerminalFont } = props

  return (
    <YakitXterm
      ref={xtermRef}
      options={{
        ...defaultTerminalSetting,
      }}
      onData={(data) => {
        commandExec && commandExec(data)
      }}
      customKeyEventHandler={() => true}
      onResize={(val) => {
        const { rows, cols } = val
        const size = {
          row: rows,
          col: cols,
        }
        onChangeSize && onChangeSize(size)
      }}
    />
  )
}

interface TerminalListBoxProps {
  initTerminalListData: TerminalDetailsProps[]
  terminalRunnerId: string
  onSelectTerminalItem: (v: string) => void
  onDeleteTerminalItem: (v: string) => void
}

/* 终端列表 */
export const TerminalListBox: React.FC<TerminalListBoxProps> = (props) => {
  const { initTerminalListData, terminalRunnerId, onSelectTerminalItem, onDeleteTerminalItem } = props
  const containerRef = useRef(null)
  const wrapperRef = useRef(null)

  const [list] = useVirtualList(initTerminalListData, {
    containerTarget: containerRef,
    wrapperTarget: wrapperRef,
    itemHeight: 22,
    overscan: 10,
  })

  return (
    <div className={styles['terminal-list-box']} ref={containerRef}>
      <div ref={wrapperRef}>
        {list.map((ele) => (
          <div
            key={ele.index}
            className={classNames(styles['list-item'], {
              [styles['list-item-active']]: ele.data.id === terminalRunnerId,
              [styles['list-item-no-active']]: ele.data.id !== terminalRunnerId,
            })}
            onClick={() => onSelectTerminalItem(ele.data.id)}
          >
            <div className={styles['content']}>
              <TerminalOutlined color="currentColor" />
              <div className={classNames(styles['title'], 'yakit-content-single-ellipsis')}>{ele.data.title}</div>
            </div>
            <div className={styles['extra']}>
              <TrashOutlined
                className={styles['delete']}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteTerminalItem(ele.data.id)
                }}
                color="currentColor"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface useTerminalHookProps {
  type: 'aiAgent' | 'yakRunner'
  terminalRef: React.MutableRefObject<any>
  folderPathRef: React.MutableRefObject<string>
  terminalSizeRef: React.MutableRefObject<{ row: number; col: number } | undefined>
  terminalFocusRef?: React.MutableRefObject<boolean>
  onExit: () => void
  isShowDetails?: boolean
  showItem?: string
}

/* 终端hook */
export const useTerminalHook = (props: useTerminalHookProps) => {
  const { type, terminalRef, folderPathRef, terminalSizeRef, terminalFocusRef, onExit, isShowDetails, showItem } = props
  // 当前终端打开项
  const [terminalIds, setTerminalIds] = useState<string[]>([])
  // 终端当前展示项
  const [terminalRunnerId, setTerminalRunnerId, getTerminalRunnerId] = useGetState<string>('')
  const [refreshList, setRefreshList, getRefreshList] = useGetState<boolean>(false)
  // 是否需要重新加载终端(终端已被整体关闭)
  const [isReloadTerminal, setReloadTerminal] = useState<boolean>(false)
  const terminalMap = useRef(new Map<string, string>())
  const get = (id: string) => terminalMap.current.get(id)
  const set = (id: string, value: string) => terminalMap.current.set(id, value)
  const remove = (id: string) => terminalMap.current.delete(id)
  const reset = () => terminalMap.current.clear()
  const streams = useRef(
    new Map<
      string,
      {
        controller: AbortController
        opening?: Promise<StreamTask<'YaklangTerminal'>>
      }
    >(),
  )

  const getMapAllTerminalKey = useMemoizedFn(() => {
    return Array.from(terminalMap.current.keys())
  })

  const onBlur = useMemoizedFn(() => {
    if (terminalFocusRef) {
      terminalFocusRef.current = false
    }
  })

  const onFocus = useMemoizedFn(() => {
    if (terminalFocusRef) {
      terminalFocusRef.current = true
    }
  })

  // 构造xtrem列表数据
  const initTerminalListData = useMemo(() => {
    const listData: TerminalDetailsProps[] = []
    terminalIds.forEach((item) => {
      try {
        const terminalCache = get(item)
        if (!terminalCache) return
        const listItem: TerminalDetailsProps = JSON.parse(terminalCache)
        listData.push(listItem)
      } catch (error) {}
    })
    return listData
  }, [terminalIds, refreshList])

  useUpdateEffect(() => {
    if (isShowDetails && isReloadTerminal) {
      if (showItem === undefined || (showItem && showItem === 'terminal')) {
        setReloadTerminal(false)
        initTerminal()
      }
    }
  }, [isShowDetails, showItem, terminalRunnerId])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.terminal.textarea.addEventListener('blur', onBlur)
      terminalRef.current.terminal.textarea.addEventListener('focus', onFocus)
      terminalRef.current.terminal.onTitleChange((path: string) => {
        // 此处路径用于终端列表名 由于需兼容mac liunx经与后端协商仅提取字符串存在\的名称其余完整展示
        let title = path
        if (path.includes('\\')) {
          const lastSlashIndex = path.lastIndexOf('\\')
          const fileName = path.substring(lastSlashIndex + 1)
          const lastIndex = fileName.lastIndexOf('.')
          if (lastIndex !== -1) {
            title = fileName.slice(0, lastIndex)
          } else {
            title = fileName
          }
        }
        const id = getTerminalRunnerId()
        const terminalCache = get(id)
        if (!terminalCache) return
        const obj: TerminalDetailsProps = JSON.parse(terminalCache)
        obj.title = title
        set(id, JSON.stringify(obj))
        setRefreshList(!getRefreshList())
      })
    }
    return () => {
      if (terminalRef.current) {
        terminalRef.current.terminal.textarea.removeEventListener('blur', onBlur)
        terminalRef.current.terminal.textarea.removeEventListener('focus', onFocus)
      }
    }
  }, [terminalRef.current])

  useEffect(() => {
    setTerminalIds(getMapAllTerminalKey())
  }, [])

  // 整体退出终端
  const onExitTernimal = useMemoizedFn(() => {
    if (terminalRef.current) {
      reset()
      onExit()
      // 重新渲染
      // setShowType(showType.filter((item) => item !== "terminal"))
      setTerminalIds([])
      setTerminalRunnerId('')
      setReloadTerminal(true)
      setRefreshList(!refreshList)
      xtermClear(terminalRef)
      const main = document.getElementById('yakit-runnner-main-box-id')
      if (main) {
        main.focus()
      }
    }
  })

  // 终端初始化
  const initTerminal = useMemoizedFn(() => {
    if (!terminalRef) return
    if (!terminalSizeRef.current) return
    try {
      // 校验map存储缓存
      const terminalCache = getMapAllTerminalKey()
      if (terminalCache.length > 0) {
        // 默认展开第一项
        const runnerId: string = terminalCache[0]

        const terminalItemCache = get(runnerId)
        if (!terminalItemCache) return
        const cache: TerminalDetailsProps = JSON.parse(terminalItemCache)
        setTerminalRunnerId(runnerId)
        setTerminalIds(terminalCache)
        writeXTerm(terminalRef, cache.content)
      } else {
        startTerminal()
      }
    } catch (error) {}
  })

  // 先建立缓存和监听，再发送初始化帧，避免丢失终端的首批输出
  const startTerminal = useMemoizedFn(() => {
    if (!terminalRef.current || !terminalSizeRef.current) return
    xtermClear(terminalRef)
    const id = uuidv4()
    const path = folderPathRef.current
    const { row, col } = terminalSizeRef.current
    const controller = new AbortController()
    set(id, JSON.stringify({ id, path, content: '', title: '' } satisfies TerminalDetailsProps))
    setTerminalRunnerId(id)
    setTerminalIds((ids) => [...ids, id])
    const finish = () => {
      if (streams.current.get(id)?.controller !== controller) return
      streams.current.delete(id)
      onListeningTerminalEnd({ id, path })
    }
    // 回调可能早于 openStream 的回复；控制器与缓存必须同步可见
    const session: { controller: AbortController; opening?: Promise<StreamTask<'YaklangTerminal'>> } = { controller }
    streams.current.set(id, session)
    session.opening = ipc.openStream(
      'grpc',
      'YaklangTerminal',
      { path, height: row, width: col },
      {
        token: `${type}:${id}`,
        signal: controller.signal,
        onData(data) {
          if (streams.current.get(id) !== session) return
          if (data.control) {
            if (data.closed) {
              controller.abort()
              finish()
            }
          } else if (data.raw?.length) onWriteXTerm(id, path, data.raw)
        },
        onError(error) {
          if (streams.current.get(id) !== session) return
          failed(error.message)
          finish()
        },
        onEnd: finish,
      },
    )
    void session.opening.catch((error) => {
      if (streams.current.get(id) !== session) return
      if (!controller.signal.aborted) failed(error.message)
      finish()
    })
  })

  const writeTerminal = useMemoizedFn(async (params: GrpcInput<'YaklangTerminal'>) => {
    const id = getTerminalRunnerId()
    const session = streams.current.get(id)
    if (!session) return
    try {
      const task = await session.opening
      if (task && streams.current.get(id) === session) await task.write(params)
    } catch (error) {
      if (!session.controller.signal.aborted) failed(error instanceof Error ? error.message : String(error))
    }
  })

  const commandExec = useMemoizedFn((cmd: string) => {
    if (terminalRef.current) void writeTerminal({ raw: new TextEncoder().encode(cmd) })
  })

  const onChangeSize = useMemoizedFn(({ row, col }: { row: number; col: number }) => {
    if (!row || !col) return
    const initialized = !!terminalSizeRef.current
    terminalSizeRef.current = { row, col }
    if (initialized) void writeTerminal({ height: row, width: col })
    else initTerminal()
  })

  // 输出
  const onWriteXTerm = useMemoizedFn((id: string, path: string, data: Uint8Array) => {
    const outPut = Uint8ArrayToString(data)
    const terminalCache = get(id)
    try {
      if (terminalCache) {
        const obj: TerminalDetailsProps = JSON.parse(terminalCache)
        const cache: TerminalDetailsProps = {
          id,
          path,
          content: obj.content + outPut,
          title: obj.title,
        }

        // 更新缓存
        set(id, JSON.stringify(cache))
        if (id === getTerminalRunnerId()) {
          writeXTerm(terminalRef, outPut)
        }
      }
    } catch (error) {}
  })

  const onListeningTerminalEnd = useMemoizedFn((data: { id: string; path: string }) => {
    const { id, path } = data
    const ids = getMapAllTerminalKey()
    if (ids.includes(id)) {
      // isShowEditorDetails && warn(`终端${path}被关闭`)
      // 列表关闭
      if (ids.length > 1) {
        if (getTerminalRunnerId() === id) {
          const itemIndex = ids.indexOf(id)
          const index = itemIndex === ids.length - 1 ? itemIndex - 1 : itemIndex + 1
          onSelectTerminalItem(ids[index])
        }
        remove(id)
        setTerminalIds(ids.filter((item) => item !== id))
        setRefreshList(!refreshList)
      }
      // 整体关闭
      else {
        onExitTernimal()
      }
    }
  })

  useEffect(
    () => () => {
      for (const session of streams.current.values()) session.controller.abort()
      streams.current.clear()
      terminalMap.current.clear()
      xtermClear(terminalRef)
    },
    [],
  )

  const onSelectTerminalItem = useMemoizedFn((id) => {
    if (getTerminalRunnerId() === id) return
    setTerminalRunnerId(id)
    const terminalCache = get(id)
    try {
      if (terminalCache && terminalRef.current) {
        const cache: TerminalDetailsProps = JSON.parse(terminalCache)
        xtermClear(terminalRef)
        writeXTerm(terminalRef, cache.content)
        terminalRef.current.terminal.scrollToBottom()
      }
    } catch (error) {}
  })

  const onDeleteTerminalItem = useMemoizedFn((id) => {
    const session = streams.current.get(id)
    if (!session) return
    streams.current.delete(id)
    session.controller.abort()
    onListeningTerminalEnd({ id, path: '' })
  })

  return [
    terminalIds,
    terminalRunnerId,
    initTerminalListData,
    { startTerminal, commandExec, onChangeSize, onSelectTerminalItem, onDeleteTerminalItem, initTerminal },
  ] as const
}
