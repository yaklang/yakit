import React, { useState } from 'react'
import type { NotepadActionProps, NotepadManageProps } from './NotepadManageType'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  CloudDownloadOutlined,
  PencilAltOutlined,
  ShareOutlined,
  TrashOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { Divider } from 'antd'
import type { API } from '@/services/swagger/resposeType'
import { useMemoizedFn } from 'ahooks'
import { apiDeleteNotepadDetail, apiGetNotepadDetail, onBaseNotepadDown } from './utils'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { isCommunityEdition } from '@/utils/envfile'
import { OnlineJudgment } from '@/pages/plugins/onlineJudgment/OnlineJudgment'
import { useGoEditNotepad } from '../hook/useGoEditNotepad'
import { failed } from '@/utils/notification'
import { type TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const NotepadShareModal = React.lazy(() => import('../NotepadShareModal/NotepadShareModal'))
const NotepadManageOnline = React.lazy(() => import('./notepadManageOnline/NotepadManageOnline'))
const NotepadManageLocal = React.lazy(() => import('./notepadManageLocal/NotepadManageLocal'))

export const timeMap = (t: TFunction) => ({
  created_at: t('NotepadAction.createdAt'),
  updated_at: t('NotepadAction.updatedAt'),
})

/**
 * @description 企业版是线上http;社区版是本地grpc
 */
const NotepadManage: React.FC<NotepadManageProps> = React.memo((props) => {
  return isCommunityEdition() ? (
    <NotepadManageLocal />
  ) : (
    <OnlineJudgment isJudgingLogin={true}>
      <NotepadManageOnline />
    </OnlineJudgment>
  )
})
export default NotepadManage

export const NotepadAction: React.FC<NotepadActionProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['notepad', 'yakitUi'])
  const { record, userInfo, onSingleDownAfter, onShareAfter, onSingleRemoveAfter } = props

  const { goEditNotepad } = useGoEditNotepad()

  const [removeItemLoading, setRemoveItemLoading] = useState<boolean>(false)
  const [downItemLoading, setDownItemLoading] = useState<boolean>(false)
  const [editLoading, setEditLoading] = useState<boolean>(false)

  const onSingleDown = useMemoizedFn((record: API.GetNotepadList) => {
    setDownItemLoading(true)
    const downParams: API.NotepadDownloadRequest = {
      hash: record.hash,
    }
    onBaseNotepadDown(downParams)
      .then((res) => {
        onSingleDownAfter(res)
      })
      .catch((err) => {
        failed(t('YakitNotification.downloadFailed', { error: err?.message || err }))
      })
      .finally(() =>
        setTimeout(() => {
          setDownItemLoading(false)
        }, 200),
      )
  })

  const onShare = useMemoizedFn((record: API.GetNotepadList) => {
    const m = showYakitModal({
      hiddenHeader: true,
      content: (
        <NotepadShareModal
          notepadInfo={record}
          onClose={() => {
            m.destroy()
            onShareAfter()
          }}
        />
      ),
      onCancel: () => {
        m.destroy()
        onShareAfter()
      },
      footer: null,
    })
  })
  const onSingleRemove = useMemoizedFn((record: API.GetNotepadList) => {
    setRemoveItemLoading(true)
    apiDeleteNotepadDetail({ hash: record.hash })
      .then(() => {
        onSingleRemoveAfter()
      })
      .finally(() => {
        setTimeout(() => {
          setRemoveItemLoading(false)
        }, 200)
      })
  })
  const onEdit = useMemoizedFn(() => {
    setEditLoading(true)
    apiGetNotepadDetail(record.hash)
      .then((res) => {
        goEditNotepad({ notepadHash: res.hash, title: res.title })
      })
      .finally(() => {
        setTimeout(() => {
          setEditLoading(false)
        }, 200)
      })
  })
  return (
    <div>
      <YakitButton
        type="text2"
        icon={<PencilAltOutlined color="currentColor" />}
        onClick={onEdit}
        loading={editLoading}
        disabled={removeItemLoading}
      />
      <Divider type="vertical" style={{ margin: '0 8px' }} />
      <YakitButton
        type="text2"
        icon={<CloudDownloadOutlined color="currentColor" />}
        onClick={() => onSingleDown(record)}
        loading={downItemLoading}
        disabled={removeItemLoading}
      />
      {record.notepadUserId === userInfo.user_id ? (
        <>
          <Divider type="vertical" style={{ margin: '0 8px' }} />
          <YakitButton
            type="text2"
            icon={<ShareOutlined color="currentColor" />}
            onClick={() => onShare(record)}
            disabled={removeItemLoading}
          />
          <Divider type="vertical" style={{ margin: '0 8px' }} />
          <YakitPopconfirm title={t('NotepadAction.confirmDelete')} onConfirm={() => onSingleRemove(record)}>
            <YakitButton danger type="text" icon={<TrashOutlined color="currentColor" />} loading={removeItemLoading} />
          </YakitPopconfirm>
        </>
      ) : null}
    </div>
  )
})
