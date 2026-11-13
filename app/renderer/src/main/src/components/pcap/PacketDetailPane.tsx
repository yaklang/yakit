import { useMemo, useState } from 'react'
import { Alert, Empty } from 'antd'
import type { TreeDataNode } from 'antd'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import YakitTree from '@/components/yakitUI/YakitTree/YakitTree'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import type { PacketDetails, PCAPPacket } from './pcapTypes'
import { decodeBytes, protocolTree, type ByteRange } from './pcapUtils'
import { PacketByteViewer } from './PacketByteViewer'
import styles from './PCAPPacketViewer.module.scss'

const expandedProtocolKeys = (nodes: TreeDataNode[], depth = 0): React.Key[] =>
  nodes.flatMap((node) => {
    if (depth > 3 || /^(Frame |Body$|Payload$|Data$)/i.test(String(node.title))) return []
    return [node.key, ...expandedProtocolKeys(node.children || [], depth + 1)]
  })

export const PacketDetailPane = ({
  packet,
  onJump,
  onClose,
}: {
  packet: PCAPPacket
  onJump: (id: string) => void
  onClose: () => void
}) => {
  const [source, setSource] = useState('frame')
  const [range, setRange] = useState<ByteRange>()
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([])
  const parsed = useMemo(() => {
    try {
      return { details: JSON.parse(packet.Details) as PacketDetails, error: '' }
    } catch {
      return {
        details: { Result: [], Messages: [], ProtocolsIndexed: false } as PacketDetails,
        error: '协议详情格式无效，仍可查看原始字节',
      }
    }
  }, [packet.Details])
  const messages = parsed.details.Messages || []
  const message = messages.find((item) => String(item.MessageId) === source)
  const bytes = useMemo(() => decodeBytes(message ? message.RAW : packet.Raw), [message, packet.Raw])
  const tree = useMemo(() => protocolTree(message ? message.Result : parsed.details.Result), [message, parsed.details])
  const selectSource = (id: string) => {
    setSource(id)
    setRange(undefined)
    setSelectedKeys([])
  }
  return (
    <section className={styles.detail} aria-label={`数据包 ${packet.Id} 详情`}>
      <div className={styles['detail-heading']}>
        <span>
          <strong>数据包 #{packet.Id}</strong>
          <small>
            {packet.Protocol} · {packet.CapturedLength} bytes
          </small>
        </span>
        <YakitButton type="text2" size="small" onClick={onClose} aria-label="关闭数据包详情">
          关闭详情
        </YakitButton>
      </div>
      <div className={styles['source-tabs']} role="tablist" aria-label="字节来源">
        <button
          type="button"
          role="tab"
          aria-selected={source === 'frame'}
          className={source === 'frame' ? styles['active-tab'] : ''}
          onClick={() => selectSource('frame')}
        >
          原始帧 #{packet.Id}
        </button>
        {messages.map((item) => (
          <button
            type="button"
            role="tab"
            key={item.MessageId}
            aria-selected={source === String(item.MessageId)}
            className={source === String(item.MessageId) ? styles['active-tab'] : ''}
            onClick={() => selectSource(String(item.MessageId))}
          >
            {item.Protocol} 消息 #{item.MessageId}
            <small>{item.PacketIds.length} 个贡献包</small>
          </button>
        ))}
      </div>
      {message && (
        <div className={styles['message-evidence']}>
          <YakitTag color={message.Status === 'decoded' && !message.DecodeError ? 'success' : 'warning'}>
            {message.Status === 'decoded' ? '已解析' : message.Status}
          </YakitTag>
          <small title={`完整性：${message.Completeness}；字节来源：${message.Kind}`}>
            {{ transaction: '事务级', message: '完整消息', headers: '仅头部' }[message.Completeness] ||
              message.Completeness}
          </small>
          <span className={styles['message-info']} title={message.Info}>
            {message.Info}
          </span>
          <span>
            贡献包{' '}
            {message.PacketIds.map((id) => (
              <button type="button" key={id} onClick={() => onJump(String(id))}>
                #{id}
              </button>
            ))}
          </span>
          {message.CompletedInPacketId > 0 && (
            <span>
              完成于{' '}
              <button type="button" onClick={() => onJump(String(message.CompletedInPacketId))}>
                #{message.CompletedInPacketId}
              </button>
            </span>
          )}
        </div>
      )}
      {(parsed.error || packet.DecodeError || message?.DecodeError) && (
        <Alert type="warning" showIcon message={parsed.error || message?.DecodeError || packet.DecodeError} />
      )}
      {!parsed.details.ProtocolsIndexed && (
        <Alert type="info" showIcon message="此数据集尚未建立协议索引；重新导入同一个文件即可补充协议分析。" />
      )}
      <div className={styles['detail-content']}>
        <YakitResizeBox
          firstRatio="42%"
          firstMinSize={220}
          secondMinSize={360}
          firstNode={
            <section className={styles['protocol-pane']}>
              <div className={styles['pane-heading']}>
                <span>协议解析</span>
                <small>{message ? '来自 protocol_messages' : '来自 packets'}</small>
              </div>
              {tree.nodes.length ? (
                <div key={source} className={styles['protocol-tree']}>
                  <YakitTree
                    key={source}
                    treeData={tree.nodes}
                    showIcon={false}
                    defaultExpandedKeys={expandedProtocolKeys(tree.nodes)}
                    selectedKeys={selectedKeys}
                    onSelect={(keys) => {
                      setSelectedKeys(keys)
                      setRange(keys.length ? tree.scopes[String(keys[0])] : undefined)
                    }}
                  />
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未提取到协议字段" />
              )}
              {message && (
                <div className={styles['byte-status']}>
                  协议字段读取自已保存的分析结果；无可靠偏移的字段不进行字节高亮。
                </div>
              )}
            </section>
          }
          secondNode={<PacketByteViewer key={source} bytes={bytes} range={range} />}
        />
      </div>
    </section>
  )
}
