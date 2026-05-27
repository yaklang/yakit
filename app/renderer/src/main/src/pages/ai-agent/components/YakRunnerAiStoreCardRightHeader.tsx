import { type FC, useMemo, useState } from 'react'
import { Tooltip } from 'antd'
import { useMemoizedFn } from 'ahooks'

import { OutlineCheckCheckIcon, OutlinePlusIcon } from '@/assets/icon/outline'
import { ColorsPreViewMDIcon, ColorsSourceCodeIcon } from '@/assets/icon/colors'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import {
  applyContentToYakRunnerActiveFile,
  createYakRunnerFile,
  getYakRunnerActiveFile,
} from '@/pages/yakRunner/yakRunnerAiCodeApplyBridge'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { yakitNotify } from '@/utils/notification'

import styles from './WebFuzzerAiStoreCardRightHeader.module.scss'

const YakRunnerAiStoreCardRightHeader: FC<{
  content?: string
  yakRunnerPageId: string
  contentType?: string
}> = ({ content, yakRunnerPageId, contentType }) => {
  const [contrastHover, setContrastHover] = useState(false)

  const guessedName = useMemo(() => {
    const type = contentType?.split('/')?.[1]
    if (!type) return 'Untitle-AI.txt'
    if (type === 'yaklang') return 'Untitle-AI.yak'
    if (type === 'python') return 'Untitle-AI.py'
    if (type === 'javascript') return 'Untitle-AI.js'
    if (type === 'typescript') return 'Untitle-AI.ts'
    if (type === 'go') return 'Untitle-AI.go'
    return `Untitle-AI.${type}`
  }, [contentType])

  const handleApplication = useMemoizedFn(() => {
    if (content == null) {
      yakitNotify('info', '没有可应用的内容。')
      return
    }
    applyContentToYakRunnerActiveFile(yakRunnerPageId, content)
  })

  const handleCreate = useMemoizedFn(() => {
    if (content == null) {
      yakitNotify('info', '没有可应用的内容。')
      return
    }
    createYakRunnerFile(yakRunnerPageId, {
      content,
      name: guessedName,
      language: contentType?.split('/')?.[1],
    })
  })

  const handleContrast = useMemoizedFn(() => {
    const current = getYakRunnerActiveFile(yakRunnerPageId)
    if (!current) {
      yakitNotify('error', '未找到当前活动的 YakRunner 文件。')
      return
    }
    const m = showYakitModal({
      title: current.name,
      footer: null,
      width: '90%',
      style: { maxWidth: 1400 },
      bodyStyle: { padding: 12 },
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: '70vh' }}>
          <div style={{ border: '1px solid var(--Colors-Use-Neutral-Bg)', overflow: 'hidden' }}>
            <YakitEditor type={current.language || 'plaintext'} value={current.code || ''} readOnly={true} />
          </div>
          <div style={{ border: '1px solid var(--Colors-Use-Neutral-Bg)', overflow: 'hidden' }}>
            <YakitEditor type={contentType?.split('/')?.[1] || 'plaintext'} value={content || ''} readOnly={true} />
          </div>
          <div style={{ gridColumn: '1 / span 2', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <YakitButton onClick={() => m.destroy()}>关闭</YakitButton>
            <YakitButton type="primary" onClick={() => handleApplication()}>
              应用到当前文件
            </YakitButton>
          </div>
        </div>
      ),
    })
  })

  return (
    <div className={styles['container']}>
      <Tooltip title="应用到当前文件">
        <YakitButton type="text2" size="small">
          <OutlineCheckCheckIcon onClick={handleApplication} />
        </YakitButton>
      </Tooltip>
      <Tooltip title="新建文件">
        <YakitButton type="text2" size="small">
          <OutlinePlusIcon onClick={handleCreate} />
        </YakitButton>
      </Tooltip>
      <Tooltip title="对比">
        <YakitButton
          type="text2"
          size="small"
          onClick={handleContrast}
          onMouseEnter={() => setContrastHover(true)}
          onMouseLeave={() => setContrastHover(false)}
        >
          {contrastHover ? <ColorsSourceCodeIcon /> : <ColorsPreViewMDIcon />}
        </YakitButton>
      </Tooltip>
    </div>
  )
}

export { YakRunnerAiStoreCardRightHeader }
