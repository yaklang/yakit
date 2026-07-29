import { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useState } from 'react'
import { useCustomFolder } from '../../components/aiFileSystemList/store/useCustomFolder'
import FileTreeSystemListWrapper from '../../components/aiFileSystemList/FileTreeSystemListWrapper/FileTreeSystemListWrapper'
import FileTreeDrop from '../FileTreeDrop/FileTreeDrop'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const FileTreeList = () => {
  const { t, i18n } = useI18nNamespaces(['aiAgent'])
  const [selected, setSelected] = useState<FileNodeProps>()
  // 用户文件夹
  const customFolder = useCustomFolder()

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <FileTreeDrop>
        {({ setDragSource }) => (
          <FileTreeSystemListWrapper
            isOpen
            key="customFolder"
            title={t('FileTreeSystem.myOpenedFiles')}
            selected={selected}
            path={customFolder}
            setSelected={setSelected}
            onTreeDragStart={() => {
              setDragSource('AIRreeToChat')
            }}
            onTreeDragEnd={() => {
              setDragSource(null)
            }}
          />
        )}
      </FileTreeDrop>
    </div>
  )
}
export default FileTreeList
