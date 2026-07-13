import React from 'react'
import { YakitModal } from '../../yakitUI/YakitModal/YakitModal'
import { OutlineDevicemobileIcon } from '@/assets/icon/outline'
import Login from '@/pages/Login'
import SetPassword from '@/pages/SetPassword'
import SelectUpload from '@/pages/SelectUpload'
import { RobotControl } from '@/pages/robotControl/RobotControl'
import robotControlStyles from '@/pages/robotControl/RobotControl.module.scss'
import {
  DynamicControl,
  SelectControlType,
  ControlMyself,
  ControlOther,
} from '../../../pages/dynamicControl/DynamicControl'
import { CeUsageStatisticsModal } from '../../CeUserMenu/CeUsageStatisticsModal'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { API } from '@/services/swagger/resposeType'
import { IMControlBadgeStatus, IMControlBadgeView } from '@/pages/robotControl/status'
import { getMobileControlIconColor } from './constants'

export interface UserMenuModalsProps {
  /** 登录弹窗 */
  loginShow: boolean
  onCancelLogin: () => void
  /** CE 使用统计弹窗 */
  usageStatisticsShow: boolean
  apiKeysInfo?: API.ApiKeyDetail
  apiKeysInfoLoading: boolean
  onCloseUsageStatistics: () => void
  onUpdateApiKey: (isLoading?: boolean) => void
  /** 修改密码弹窗 */
  passwordShow: boolean
  passwordClose: boolean
  onCancelPassword: () => void
  /** 用户信息（修改密码组件需要） */
  userInfo: any
  /** 上传数据弹窗 */
  uploadModalShow: boolean
  onCancelUpload: () => void
  /** 机器人控制弹窗 */
  robotControlModal: boolean
  onCancelRobotControl: () => void
  imControlBadge: IMControlBadgeView
  imControlStatus: IMControlBadgeStatus | undefined
  refreshIMControlStatus: () => void
  /** 远程控制弹窗 */
  dynamicControlModal: boolean
  onCancelDynamicControl: () => void
  controlMyselfModal: boolean
  onCancelControlMyself: () => void
  controlOtherModal: boolean
  onCancelControlOther: () => void
  /** 远程控制弹窗 setter */
  setDynamicControlModal: (v: boolean) => void
  setControlMyselfModal: (v: boolean) => void
  setControlOtherModal: (v: boolean) => void
  runDynamicControlRemote: (v: string, url: string) => void
}

/**
 * 用户菜单相关弹窗渲染组件
 *
 * 包含：登录、CE使用统计、修改密码、上传数据、机器人控制、远程控制(×3)
 */
export const UserMenuModals: React.FC<UserMenuModalsProps> = React.memo((props) => {
  const {
    loginShow,
    onCancelLogin,
    usageStatisticsShow,
    apiKeysInfo,
    apiKeysInfoLoading,
    onCloseUsageStatistics,
    onUpdateApiKey,
    passwordShow,
    passwordClose,
    onCancelPassword,
    userInfo,
    uploadModalShow,
    onCancelUpload,
    robotControlModal,
    onCancelRobotControl,
    imControlBadge,
    imControlStatus,
    refreshIMControlStatus,
    dynamicControlModal,
    onCancelDynamicControl,
    controlMyselfModal,
    onCancelControlMyself,
    controlOtherModal,
    onCancelControlOther,
    setDynamicControlModal,
    setControlMyselfModal,
    setControlOtherModal,
    runDynamicControlRemote,
  } = props
  const { t } = useI18nNamespaces(['layout', 'yakitUi'])

  return (
    <>
      {loginShow && <Login visible={loginShow} onCancel={onCancelLogin} />}

      {apiKeysInfo && (
        <CeUsageStatisticsModal
          visible={usageStatisticsShow}
          apiKeysInfo={apiKeysInfo}
          onClose={onCloseUsageStatistics}
          update={() => onUpdateApiKey(true)}
          loading={apiKeysInfoLoading}
        />
      )}

      <YakitModal
        visible={passwordShow}
        closable={passwordClose}
        title={t('Main.setPassword')}
        destroyOnClose={true}
        maskClosable={false}
        bodyStyle={{ padding: '10px 24px 24px 24px' }}
        width={520}
        onCancel={onCancelPassword}
        footer={null}
      >
        <SetPassword onCancel={onCancelPassword} userInfo={userInfo} />
      </YakitModal>

      <YakitModal
        visible={uploadModalShow}
        title={t('FuncDomain.uploadData')}
        destroyOnClose={true}
        maskClosable={false}
        bodyStyle={{ padding: '10px 24px 24px 24px' }}
        width={520}
        onCancel={onCancelUpload}
        footer={null}
      >
        <SelectUpload onCancel={onCancelUpload} />
      </YakitModal>

      <YakitModal
        visible={robotControlModal}
        title={
          <div className={robotControlStyles['robot-modal-title']}>
            <OutlineDevicemobileIcon
              className={robotControlStyles['mobile-control-title-icon']}
              style={{ color: getMobileControlIconColor(imControlBadge.color) }}
            />
            {t('FuncDomain.mobileControl')}
          </div>
        }
        subTitle={t('RobotControl.subTitle')}
        type="white"
        size="large"
        destroyOnClose={true}
        maskClosable={false}
        bodyStyle={{ padding: '8px 16px 16px' }}
        width={900}
        onCancel={onCancelRobotControl}
        footer={null}
      >
        <RobotControl
          onCancel={onCancelRobotControl}
          onRuntimeStatusChange={refreshIMControlStatus}
          runtimeStatus={imControlStatus}
        />
      </YakitModal>
      <DynamicControl
        mainTitle={t('FuncDomain.remoteControl')}
        secondTitle={t('FuncDomain.selectRole')}
        isShow={dynamicControlModal}
        onCancel={onCancelDynamicControl}
        width={345}
      >
        <SelectControlType
          onControlMyself={() => {
            setControlMyselfModal(true)
            onCancelDynamicControl()
          }}
          onControlOther={() => {
            setControlOtherModal(true)
            onCancelDynamicControl()
          }}
        />
      </DynamicControl>

      <DynamicControl
        mainTitle={t('FuncDomain.controlledSide')}
        secondTitle={t('FuncDomain.controlledSideDesc')}
        isShow={controlMyselfModal}
        onCancel={onCancelControlMyself}
      >
        <ControlMyself
          goBack={() => {
            setDynamicControlModal(true)
            onCancelControlMyself()
          }}
        />
      </DynamicControl>

      <DynamicControl
        mainTitle={t('FuncDomain.controllerSide')}
        secondTitle={t('FuncDomain.controllerSideDesc')}
        isShow={controlOtherModal}
        onCancel={onCancelControlOther}
      >
        <ControlOther
          goBack={() => {
            setDynamicControlModal(true)
            onCancelControlOther()
          }}
          runControl={(v: string, url: string) => {
            onCancelControlOther()
            runDynamicControlRemote(v, url)
          }}
        />
      </DynamicControl>
    </>
  )
})
