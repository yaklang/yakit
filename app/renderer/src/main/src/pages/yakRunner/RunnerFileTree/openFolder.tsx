import { useState, type FC } from 'react'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import i18n from '@/i18n/i18n'
import { YakitDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { SystemInfo } from '@/constants/hardware'
import emiter from '@/utils/eventBus/eventBus'
import { warn } from '@/utils/notification'
import type { OpenFolderDraggerProps } from './RunnerFileTreeType'

const tOriginal = i18n.getFixedT(null, 'yakRunner')

export const OpenFolderDragger: FC<OpenFolderDraggerProps> = (props) => {
  const { setAbsolutePath } = props
  const { t } = useI18nNamespaces(['yakRunner'])
  const [value, setValue] = useState<string>('')
  return (
    <div style={{ padding: '20px 24px' }}>
      <YakitDragger
        value={value}
        isShowPathNumber={false}
        selectType="folder"
        multiple={false}
        help=""
        uploadFolderText={t('RunnerFileTree.selectLocalFolder')}
        onChange={(next) => {
          setValue(next)
          setAbsolutePath(next)
        }}
      />
    </div>
  )
}

/** 打开文件夹（独立文件，避免 RunnerTabs ↔ RunnerFileTree 循环依赖） */
export const openFolder = () => {
  if (SystemInfo.mode === 'remote') {
    let absolutePath = ''
    const m = showYakitModal({
      title: (modalT) => modalT('RunnerFileTree.enterFolderPath'),
      width: 400,
      type: 'white',
      closable: false,
      centered: true,
      content: <OpenFolderDragger setAbsolutePath={(v) => (absolutePath = v)} />,
      onCancel: () => {
        m.destroy()
      },
      onOk: async () => {
        if (absolutePath.length === 0) {
          warn(tOriginal('RunnerFileTree.enterFolderPath'))
          return
        }
        emiter.emit('onOpenFileTree', absolutePath)
        m.destroy()
      },
    })
  } else {
    handleOpenFileSystemDialog({ title: tOriginal('RunnerFileTree.selectFolder'), properties: ['openDirectory'] }).then(
      (data) => {
        if (data.filePaths.length) {
          emiter.emit('onOpenFileTree', data.filePaths[0])
        }
      },
    )
  }
}
