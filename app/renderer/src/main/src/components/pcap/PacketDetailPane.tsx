import { useCallback, useMemo, useState } from 'react'
import { Alert, Empty } from 'antd'
import type { TreeDataNode } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import YakitTree from '@/components/yakitUI/YakitTree/YakitTree'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import type { PCAPByteSource, PCAPFieldNode, PCAPPacketDetail } from './pcapTypes'
import { fieldTree, formatBytes, type FieldSelection, type PCAPFieldTreeNode } from './pcapUtils'
import { copySelection, saveSelection, type PCAPCopyFormat, type PCAPSaveFormat } from './pcapByteActions'
import { PacketByteViewer } from './PacketByteViewer'
import styles from './PCAPPacketViewer.module.scss'

type FieldAction = `copy-${PCAPCopyFormat}` | `save-${PCAPSaveFormat}`

const PacketFieldTitle = ({
  node,
  selection,
  busy,
  onAction,
}: {
  node: TreeDataNode
  selection?: FieldSelection
  busy: boolean
  onAction: (selection: FieldSelection, action: FieldAction) => void
}) => {
  const fieldNode = node as PCAPFieldTreeNode
  if (!fieldNode.fieldName) return null
  const hasBytes = Boolean(selection?.ranges.length)
  const menu = {
    width: 196,
    data: hasBytes
      ? [
          { key: 'copy-hex', label: '复制 HEX', disabled: busy },
          { key: 'copy-utf8', label: '复制 UTF-8 文本', disabled: busy },
          { key: 'copy-base64', label: '复制 Base64', disabled: busy },
          { key: 'save-raw', label: '保存原始字节 (.bin)', disabled: busy },
          { key: 'save-hex', label: '保存 HEX 文本 (.txt)', disabled: busy },
          { key: 'save-utf8', label: '保存 UTF-8 文本 (.txt)', disabled: busy },
          { key: 'save-base64', label: '保存 Base64 文本 (.txt)', disabled: busy },
        ]
      : [{ key: 'no-bytes', label: '该节点没有可导出字节', disabled: true }],
    onClick: ({ key }: { key: string }) => {
      if (selection) onAction(selection, key as FieldAction)
    },
  }
  const title = (
    <span
      className={styles['field-node']}
      data-depth={fieldNode.fieldDepth}
      data-tone={fieldNode.fieldTone}
      data-container={Boolean(fieldNode.children?.length)}
    >
      {fieldNode.fieldDepth === 0 ? <i className={styles['field-node-dot']} /> : null}
      <span className={styles['field-node-name']} title={fieldNode.fieldName}>
        {fieldNode.fieldName}
      </span>
      {fieldNode.fieldValue ? (
        <span className={styles['field-node-value']} title={fieldNode.fieldValue}>
          {fieldNode.fieldValue}
        </span>
      ) : null}
    </span>
  )
  return (
    <YakitDropdownMenu menu={menu} dropdown={{ trigger: ['contextMenu'], placement: 'bottomLeft' }}>
      {title}
    </YakitDropdownMenu>
  )
}

type DetailView = 'frame' | 'message'

const visibleContributorCount = 3

const PacketJumpLinks = ({
  ids,
  label,
  title,
  itemHint,
  onJump,
}: {
  ids: string[]
  label: string
  title: string
  itemHint: string
  onJump: (id: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const packetIDs = Array.from(new Set(ids))
  const visibleIDs = packetIDs.slice(0, visibleContributorCount)
  const hiddenCount = packetIDs.length - visibleIDs.length
  const jump = (id: string) => {
    setOpen(false)
    onJump(id)
  }

  return (
    <span className={styles['detail-contributors']}>
      {label}
      {visibleIDs.map((id) => (
        <button type="button" key={id} onClick={() => jump(id)}>
          #{id}
        </button>
      ))}
      {hiddenCount > 0 && (
        <YakitPopover
          open={open}
          onOpenChange={setOpen}
          trigger="click"
          placement="bottomLeft"
          classNames={{ root: styles['contributor-popover-overlay'] }}
          content={
            <section className={styles['contributor-popover']} aria-label={title}>
              <header className={styles['contributor-popover-header']}>
                <div>
                  <strong>{title}</strong>
                  <span>{itemHint}</span>
                </div>
                <span className={styles['contributor-popover-count']}>{packetIDs.length}</span>
              </header>
              <div className={styles['contributor-popover-list']}>
                {packetIDs.map((id) => (
                  <button type="button" key={id} aria-label={`跳转到${itemHint} #${id}`} onClick={() => jump(id)}>
                    <span className={styles['contributor-popover-id']}>#{id}</span>
                    <span className={styles['contributor-popover-action']}>跳转</span>
                  </button>
                ))}
              </div>
            </section>
          }
        >
          <button
            type="button"
            className={styles['contributor-popover-trigger']}
            aria-label={`查看全部 ${packetIDs.length} 个${title}`}
          >
            +{hiddenCount}
          </button>
        </YakitPopover>
      )}
    </span>
  )
}

export const PacketDetailPane = ({
  datasetID,
  detail,
  onJump,
  onClose,
}: {
  datasetID: string
  detail: PCAPPacketDetail
  onJump: (id: string) => void
  onClose: () => void
}) => {
  const frameID = `frame:${detail.Packet.Id}`
  const storedFrameSource = detail.ByteSources.find((source) => source.Kind === 'frame')
  const frameSource: PCAPByteSource = storedFrameSource || {
    ID: frameID,
    Kind: 'frame',
    Name: `Frame #${detail.Packet.Id}`,
    Length: detail.Packet.CapturedLength,
    Completeness: 'frame',
    ContributorPacketIds: [],
    CompletedInPacketId: '0',
    InitialData: [],
    InitialOffset: '0',
    InitialTruncated: false,
  }
  const sourceList = storedFrameSource ? detail.ByteSources : [frameSource, ...detail.ByteSources]
  const hasMessages = detail.Messages.length > 0
  const [view, setView] = useState<DetailView>('frame')
  const [messageSourceID, setMessageSourceID] = useState(detail.Messages[0]?.SourceID || '')
  const [selection, setSelection] = useState<FieldSelection>()
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([])
  const [byteActionBusy, setByteActionBusy] = useState(false)
  const source = view === 'frame' ? frameSource : sourceList.find((item) => item.ID === messageSourceID)
  const message = view === 'message' ? detail.Messages.find((item) => item.SourceID === source?.ID) : undefined
  const frameNodes = useMemo<PCAPFieldNode[]>(() => {
    if (detail.Nodes.length) return detail.Nodes
    const length = Math.max(0, Number(detail.Packet.CapturedLength) || 0)
    return [
      {
        Name: `Frame ${detail.Packet.Id}`,
        DisplayValue: formatBytes(length),
        Children: [],
        Ranges: [{ SourceID: frameSource.ID, BitOffset: '0', BitLength: String(length * 8) }],
      },
    ]
  }, [detail.Nodes, detail.Packet.CapturedLength, detail.Packet.Id, frameSource.ID])
  const tree = useMemo(
    () => fieldTree(view === 'frame' ? frameNodes : message?.Nodes || []),
    [frameNodes, message?.Nodes, view],
  )

  const selectView = (next: DetailView) => {
    setView(next)
    setSelection(undefined)
    setSelectedKeys([])
    if (
      next === 'message' &&
      !detail.Messages.some((item) => item.SourceID === messageSourceID) &&
      detail.Messages[0]
    ) {
      setMessageSourceID(detail.Messages[0].SourceID)
    }
  }

  const runFieldAction = useCallback(
    async (fieldSelection: FieldSelection, action: FieldAction) => {
      if (byteActionBusy) return
      setByteActionBusy(true)
      try {
        if (action.startsWith('copy-')) {
          await copySelection(datasetID, fieldSelection, action.slice(5) as PCAPCopyFormat)
        } else {
          await saveSelection(datasetID, fieldSelection, action.slice(5) as PCAPSaveFormat)
        }
      } finally {
        setByteActionBusy(false)
      }
    },
    [byteActionBusy, datasetID],
  )

  return (
    <section className={styles.detail} aria-label={`数据包 ${detail.Packet.Id} 详情`}>
      <div className={styles['detail-toolbar']}>
        <div className={styles['detail-identity']}>
          <strong>#{detail.Packet.Id}</strong>
          <span>{detail.Packet.Protocol}</span>
          <small>{formatBytes(detail.Packet.CapturedLength)}</small>
          {detail.Messages.length > 0 && <small>{detail.Messages.length} 条消息</small>}
        </div>
        {hasMessages && (
          <div className={styles['source-tabs']} role="tablist" aria-label="详情视图">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'frame'}
              className={view === 'frame' ? styles['active-tab'] : ''}
              onClick={() => selectView('frame')}
              title={frameSource.Name}
            >
              物理帧
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'message'}
              className={view === 'message' ? styles['active-tab'] : ''}
              onClick={() => selectView('message')}
              title={detail.Messages.map((item) => item.Summary).join('\n')}
            >
              重组流
            </button>
          </div>
        )}
        {hasMessages && (
          <div className={styles['detail-context']}>
            {view === 'message' && message ? (
              <>
                <span className={styles['detail-message-summary']} title={message.Summary}>
                  {message.Summary}
                </span>
                {!!source?.ContributorPacketIds.length && (
                  <PacketJumpLinks
                    ids={source.ContributorPacketIds}
                    label="贡献帧"
                    title="重组贡献帧"
                    itemHint="物理帧"
                    onJump={onJump}
                  />
                )}
              </>
            ) : detail.RelatedMessages.length > 0 ? (
              <PacketJumpLinks
                ids={detail.RelatedMessages.flatMap((related) =>
                  related.CompletedInPacketId && related.CompletedInPacketId !== '0'
                    ? [related.CompletedInPacketId]
                    : [],
                )}
                label={`参与 ${detail.RelatedMessages.length} 条消息`}
                title="相关完成帧"
                itemHint="完成帧"
                onJump={onJump}
              />
            ) : null}
          </div>
        )}
        <YakitButton
          type="text2"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
          aria-label="关闭数据包详情"
          className={styles['detail-close']}
        />
      </div>
      {(message?.DecodeError || detail.Packet.DecodeError) && (
        <Alert type="warning" showIcon message={message?.DecodeError || detail.Packet.DecodeError} />
      )}
      {message?.NodesTruncated && (
        <Alert type="warning" showIcon message="协议字段过多，字段树只返回了受限的展示范围。" />
      )}
      {!source ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到字节来源" />
      ) : (
        <div className={styles['detail-content']}>
          <YakitResizeBox
            firstRatio="42%"
            firstMinSize={220}
            secondMinSize={360}
            firstNode={
              <section className={styles['protocol-pane']}>
                {tree.nodes.length ? (
                  <div key={source.ID} className={styles['protocol-tree']}>
                    <YakitTree
                      treeData={tree.nodes}
                      showIcon={false}
                      titleRender={(node) => (
                        <PacketFieldTitle
                          node={node}
                          selection={tree.selections[String(node.key)]}
                          busy={byteActionBusy}
                          onAction={runFieldAction}
                        />
                      )}
                      defaultExpandAll={false}
                      selectedKeys={selectedKeys}
                      onSelect={(keys) => {
                        setSelectedKeys(keys)
                        const next = keys.length ? tree.selections[String(keys[0])] : undefined
                        setSelection(next)
                        if (next?.sourceID && next.sourceID !== source.ID) {
                          const nextSource = sourceList.find((item) => item.ID === next.sourceID)
                          if (nextSource?.Kind === 'frame') {
                            setView('frame')
                          } else if (nextSource) {
                            setView('message')
                            setMessageSourceID(next.sourceID)
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未提取到协议字段" />
                )}
              </section>
            }
            secondNode={
              <PacketByteViewer key={source.ID} datasetID={datasetID} source={source} selection={selection} />
            }
          />
        </div>
      )}
    </section>
  )
}
