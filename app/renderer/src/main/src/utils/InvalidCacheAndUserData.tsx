import { yakitNotify } from '@/utils/notification'
import { Alert, Space } from 'antd'
import { getReleaseEditionName } from './envfile'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { yakitHost } from '@/services/electronBridge'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, 'utils')

export const invalidCacheAndUserData = (delTemporaryProject) => {
  let checked = false
  const m = showYakitModal({
    type: 'white',
    title: tOriginal('InvalidCacheAndUserData.title'),
    content: (
      <Space direction={'vertical'} style={{ width: '100%', padding: 20 }}>
        <Alert
          type="success"
          message={tOriginal('InvalidCacheAndUserData.resetHint', { name: getReleaseEditionName() })}
        />
        <Alert type="success" message={tOriginal('InvalidCacheAndUserData.warning')} />
        <YakitCheckbox onChange={(e) => (checked = e.target.checked)}>
          {tOriginal('InvalidCacheAndUserData.syncDeleteDatabase')}
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
