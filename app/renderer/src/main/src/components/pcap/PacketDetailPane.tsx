import { useMemo, useState } from 'react'
import { Alert, Empty } from 'antd'
import type { TreeDataNode } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import YakitTree from '@/components/yakitUI/YakitTree/YakitTree'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import type { PCAPPacketDetail } from './pcapTypes'
import { fieldTree, formatBytes, type FieldSelection } from './pcapUtils'
import { PacketByteViewer } from './PacketByteViewer'
import styles from './PCAPPacketViewer.module.scss'

const expandedProtocolKeys = (nodes: TreeDataNode[], depth = 0): React.Key[] =>
  nodes.flatMap((node) => {
    if (depth > 3 || /^(Frame |Body|Payload|Data)/i.test(String(node.title))) return []
    return [node.key, ...expandedProtocolKeys(node.children || [], depth + 1)]
  })

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
  const frameSource = detail.ByteSources.find((source) => source.Kind === 'frame')
  const reassembledMessages = detail.Messages.filter((message) => {
    const byteSource = detail.ByteSources.find((source) => source.ID === message.SourceID)
    return (byteSource?.ContributorPacketIds.length || 0) > 1
  })
  const hasReassembly = reassembledMessages.length > 0
  const directMessage = !hasReassembly ? detail.Messages[0] : undefined
  const initialSourceID = hasReassembly
    ? frameSource?.ID || `frame:${detail.Packet.Id}`
    : directMessage?.SourceID || frameSource?.ID || `frame:${detail.Packet.Id}`
  const [sourceID, setSourceID] = useState(initialSourceID)
  const [selection, setSelection] = useState<FieldSelection>()
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([])
  const source = detail.ByteSources.find((item) => item.ID === sourceID)
  const message = detail.Messages.find((item) => item.SourceID === sourceID)
  const tree = useMemo(() => fieldTree(message?.Nodes || detail.Nodes), [detail.Nodes, message?.Nodes])

  const selectSource = (id: string) => {
    setSourceID(id)
    setSelection(undefined)
    setSelectedKeys([])
  }
  const sourceLabel = (id: string) => {
    const source = detail.ByteSources.find((item) => item.ID === id)
    if (!source || source.Kind === 'frame') return '原始帧'
    const message = detail.Messages.find((item) => item.SourceID === id)
    return `${message?.Protocol || '协议'}重组`
  }

  return (
    <section className={styles.detail} aria-label={`数据包 ${detail.Packet.Id} 详情`}>
      <div className={styles['detail-toolbar']}>
        <div className={styles['detail-identity']}>
          <strong>#{detail.Packet.Id}</strong>
          <span>{detail.Packet.Protocol}</span>
          <small>{formatBytes(detail.Packet.CapturedLength)}</small>
          {detail.Messages.length > 0 && <small>{detail.Messages.length} 条消息</small>}
        </div>
        {hasReassembly && (
          <div className={styles['source-tabs']} role="tablist" aria-label="字节来源">
            {frameSource && (
              <button
                type="button"
                role="tab"
                aria-selected={sourceID === frameSource.ID}
                className={sourceID === frameSource.ID ? styles['active-tab'] : ''}
                onClick={() => selectSource(frameSource.ID)}
                title={frameSource.Name}
              >
                原始帧
              </button>
            )}
            {reassembledMessages.map((reassembledMessage) => {
              const reassembledSource = detail.ByteSources.find((item) => item.ID === reassembledMessage.SourceID)
              if (!reassembledSource) return null
              return (
                <button
                  type="button"
                  role="tab"
                  key={reassembledSource.ID}
                  aria-selected={sourceID === reassembledSource.ID}
                  className={sourceID === reassembledSource.ID ? styles['active-tab'] : ''}
                  onClick={() => selectSource(reassembledSource.ID)}
                  title={reassembledSource.Name}
                >
                  {sourceLabel(reassembledSource.ID)}
                </button>
              )
            })}
          </div>
        )}
        {hasReassembly && (
          <div className={styles['detail-context']}>
            {message ? (
              <>
                <span className={styles['detail-message-summary']} title={message.Summary}>
                  {message.Summary}
                </span>
                {!!source?.ContributorPacketIds.length && (
                  <span className={styles['detail-contributors']}>
                    贡献帧{' '}
                    {source.ContributorPacketIds.map((id) => (
                      <button type="button" key={id} onClick={() => onJump(id)}>
                        #{id}
                      </button>
                    ))}
                  </span>
                )}
              </>
            ) : detail.RelatedMessages.length > 0 ? (
              <span className={styles['detail-contributors']}>
                参与 {detail.RelatedMessages.length} 条消息
                {detail.RelatedMessages.map((related) =>
                  related.CompletedInPacketId && related.CompletedInPacketId !== '0' ? (
                    <button type="button" key={related.SourceID} onClick={() => onJump(related.CompletedInPacketId)}>
                      #{related.CompletedInPacketId}
                    </button>
                  ) : null,
                )}
              </span>
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
                  <div key={sourceID} className={styles['protocol-tree']}>
                    <YakitTree
                      treeData={tree.nodes}
                      showIcon={false}
                      defaultExpandedKeys={expandedProtocolKeys(tree.nodes)}
                      selectedKeys={selectedKeys}
                      onSelect={(keys) => {
                        setSelectedKeys(keys)
                        const next = keys.length ? tree.selections[String(keys[0])] : undefined
                        setSelection(next)
                        if (next?.sourceID && next.sourceID !== sourceID) setSourceID(next.sourceID)
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
