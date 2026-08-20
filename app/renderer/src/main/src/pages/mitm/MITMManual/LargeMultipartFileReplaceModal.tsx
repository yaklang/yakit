import React, { useState } from 'react'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import { grpcMITMV2ReplaceLargeRequestFile, type MITMV2ReplaceLargeRequestFileResponse } from './utils'
import type { LargeRequestReplacementMarker } from './largeMultipartReplacement'
import styles from './MITMManual.module.scss'

interface LargeRequestFileReplaceModalProps {
  /** MITM 手动劫持模式需要 taskID；Web Fuzzer 模式不需要。 */
  taskID?: string
  marker: LargeRequestReplacementMarker
  onCancel: () => void
  onComplete: (result: MITMV2ReplaceLargeRequestFileResponse) => void
  /** 'mitm' 会把文件分块上传到引擎，放行请求时替换；'fuzzer' 只返回文件信息，由调用方写入编辑器。 */
  mode?: 'mitm' | 'fuzzer'
}

export const LargeRequestFileReplaceModal: React.FC<LargeRequestFileReplaceModalProps> = React.memo((props) => {
  const { taskID, marker, onCancel, onComplete, mode = 'mitm' } = props
  const { t } = useI18nNamespaces(['mitm'])
  const [filePath, setFilePath] = useState('')
  const [loading, setLoading] = useState(false)

  const replaceFile = async () => {
    if (!filePath) {
      yakitNotify('warning', t('MITMManual.select_replacement_file'))
      return
    }
    setLoading(true)
    try {
      let result: MITMV2ReplaceLargeRequestFileResponse
      if (mode === 'fuzzer') {
        const stat = await window.require('electron').ipcRenderer.invoke('is-file-exists', filePath)
          .then(() => true)
          .catch(() => false)
        if (!stat) {
          throw new Error('selected file does not exist')
        }
        result = { Filename: filePath, Size: 0 }
      } else {
        if (!taskID) {
          throw new Error('MITM mode requires taskID')
        }
        result = await grpcMITMV2ReplaceLargeRequestFile({
          TaskID: taskID,
          ReplaceBody: marker.kind === 'body',
          PartIndex: marker.kind === 'multipart' ? marker.partIndex : undefined,
          FilePath: filePath,
        })
      }
      yakitNotify('success', t('MITMManual.replace_large_file_uploaded'))
      onComplete(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles['large-request-replace-modal']}>
      <YakitAlert
        type="warning"
        showIcon
        message={t(
          marker.kind === 'body' ? 'MITMManual.replace_large_body_warning' : 'MITMManual.replace_large_file_warning',
        )}
      />
      <div className={styles['large-request-replace-field']}>
        <span>{t('MITMManual.upload_file')}</span>
        <YakitDragger
          value={filePath}
          onChange={setFilePath}
          multiple={false}
          selectType="file"
          disabled={loading}
          isShowPathNumber={false}
        />
      </div>
      <div className={styles['large-request-replace-actions']}>
        <YakitButton type="outline2" disabled={loading} onClick={onCancel}>
          {t('MITMManual.cancel')}
        </YakitButton>
        <YakitButton type="primary" loading={loading} onClick={replaceFile}>
          {t('MITMManual.confirm')}
        </YakitButton>
      </div>
    </div>
  )
})
