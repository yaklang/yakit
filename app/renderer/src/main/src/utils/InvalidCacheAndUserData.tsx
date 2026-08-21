import { yakitNotify } from '@/utils/notification'
import { Space } from 'antd'
import { getReleaseEditionName } from './envfile'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { yakitHost } from '@/services/electronBridge'
import i18n from '@/i18n/i18n'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
const tOriginal = i18n.getFixedT(null, 'utils')

export const invalidCacheAndUserData = (delTemporaryProject) => {
  let checked = false
  const m = showYakitModal({
    type: 'white',
    title: (modalT) => modalT('InvalidCacheAndUserData.title'),
    content: (modalT) => (
      <Space direction={'vertical'} style={{ width: '100%', padding: 20 }}>
        <YakitAlert
          type="success"
          message={modalT('InvalidCacheAndUserData.resetHint', { name: getReleaseEditionName() })}
        />
        <YakitAlert type="success" message={modalT('InvalidCacheAndUserData.warning')} />
        <YakitCheckbox onChange={(e) => (checked = e.target.checked)}>
          {modalT('InvalidCacheAndUserData.syncDeleteDatabase')}
        </YakitCheckbox>
      </Space>
    ),
    width: 700,
    onOkText: tOriginal('InvalidCacheAndUserData.confirmDelete'),
    okButtonProps: {
      danger: true,
    },
    onOk: async () => {
      m.destroy()
      await delTemporaryProject()
      yakitHost
        .resetAndInvalidUserData({ OnlyClearCache: !checked })
        .then(() => {})
        .catch((e) => {})
        .finally(() => {
          yakitNotify('success', tOriginal('InvalidCacheAndUserData.resetSuccess'))
        })
    },
  })
}
