import { useState } from 'react'
import type { FC } from 'react'
import { useDeepCompareEffect, useRequest } from 'ahooks'
import numeral from 'numeral'
import { PaperClipOutlined, PlusSmOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { imgTypes } from '@/components/MilkdownEditor/utils/utils'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getFileSuffixFromName, getPathBaseName } from '@/utils/str'
import { FileExcelIcon, FilePdfIcon, FilePptIcon, FileUnknownIcon, FileWordIcon } from '../../fileIcon'
import { MAX_ATTACHMENTS_PER_BATCH } from '../../type'
import MaterialListPanel from '../materialListPanel/MaterialListPanel'
import type { MaterialAttachmentListProps } from './type'
import { loadAttachmentSizes } from './attachmentSizes'
import styles from './MaterialAttachmentList.module.scss'

const fileIcons = new Map([
  ['pdf', FilePdfIcon],
  ['ppt', FilePptIcon],
  ['pptx', FilePptIcon],
  ['xls', FileExcelIcon],
  ['xlsx', FileExcelIcon],
  ['doc', FileWordIcon],
  ['docx', FileWordIcon],
])

const MaterialAttachmentList: FC<MaterialAttachmentListProps> = ({ attachments, onAdd, onRemove }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [search, setSearch] = useState('')
  const [failedImagePaths, setFailedImagePaths] = useState(() => new Set<string>())
  const paths = attachments.map((attachment) => attachment.mentionId).filter((path) => !path.startsWith('blob:'))
  const { data: sizes = {}, run: loadSizes } = useRequest(loadAttachmentSizes, { manual: true })
  useDeepCompareEffect(() => {
    loadSizes(paths)
  }, [paths])

  const keyword = search.trim().toLowerCase()
  const visibleAttachments = attachments.filter((attachment) => attachment.mentionName.toLowerCase().includes(keyword))

  return (
    <MaterialListPanel
      title={
        <>
          {t('AIAddMaterialsPopover.addedAttachments')} <span>({attachments.length})</span>
        </>
      }
      description={t('AIAddMaterialsPopover.attachmentHint', { max: MAX_ATTACHMENTS_PER_BATCH })}
      icon={<PaperClipOutlined size={16} />}
      search={search}
      onSearchChange={setSearch}
      variant="attachments"
      headerAction={
        <YakitButton
          type="text"
          className={styles.add}
          icon={<PlusSmOutlined size={16} />}
          iconPosition="end"
          onClick={onAdd}
        >
          {t('YakitButton.add')}
        </YakitButton>
      }
    >
      <div className={styles.list}>
        {visibleAttachments.map((attachment) => {
          const { mentionId: path, mentionName: displayName } = attachment
          const fileName = getPathBaseName(displayName)
          const suffix = getFileSuffixFromName(fileName)
          const extension = suffix ? `.${suffix}` : ''
          const name = fileName.slice(0, fileName.length - extension.length)
          const fileType = suffix.toLowerCase()
          const FileIcon = fileIcons.get(fileType) ?? FileUnknownIcon
          const isPendingImage = path.startsWith('blob:')
          const showThumbnail = !failedImagePaths.has(path) && (isPendingImage || imgTypes.includes(`.${fileType}`))
          return (
            <div className={styles.item} key={path}>
              {showThumbnail ? (
                <img
                  className={styles['file-icon']}
                  src={isPendingImage ? path : `atom://${path}`}
                  alt={fileName}
                  loading="lazy"
                  onError={() => setFailedImagePaths((current) => new Set(current).add(path))}
                />
              ) : (
                <FileIcon className={styles['file-icon']} />
              )}
              <div className={styles.info}>
                <div className={styles.filename} title={displayName}>
                  <span className={styles.basename}>{name}</span>
                  <span>{extension}</span>
                </div>
                <div className={styles.size}>
                  {sizes[path] === undefined ? '' : numeral(sizes[path]).format('0.[0] b')}
                </div>
              </div>
              <YakitButton
                type="text2"
                className={styles.remove}
                icon={<TrashOutlined size={16} color="currentColor" />}
                aria-label={`${t('YakitButton.delete')} ${fileName}`}
                disabled={attachment.lock}
                onClick={() => onRemove(attachment)}
              />
            </div>
          )
        })}
        {visibleAttachments.length === 0 && <div className={styles.empty}>{t('YakitEmpty.noData')}</div>}
      </div>
    </MaterialListPanel>
  )
}

export default MaterialAttachmentList
