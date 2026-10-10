import React from 'react'
import { Avatar, Upload } from 'antd'
import CameraOutlined from '@ant-design/icons/lib/icons/CameraOutlined'
import { UsersSolid } from '@yakit-libs/yakit-ui-icons/solid'
import { useMemoizedFn } from 'ahooks'
import type { UserInfoProps } from '@/store'
import { failed, success } from '@/utils/notification'
import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import { httpDeleteOSSResource } from '@/apiUtils/http'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import './SetUserInfo.scss'

const { ipcRenderer } = window.require('electron')

export const judgeAvatar = (userInfo, size: number, avatarColor: string) => {
  const { companyHeadImg, companyName } = userInfo

  return companyHeadImg && !!companyHeadImg.length ? (
    <Avatar size={size} style={{ cursor: 'pointer' }} src={companyHeadImg} />
  ) : (
    <Avatar size={size} style={{ backgroundColor: avatarColor, cursor: 'pointer' }}>
      {companyName && companyName.slice(0, 1)}
    </Avatar>
  )
}

export interface SetUserInfoProp {
  userInfo: UserInfoProps
  setStoreUserInfo: (info: any) => void
  avatarColor: string
}

// 可上传文件类型
const FileType = ['image/png', 'image/jpeg', 'image/png']

// 用户信息
export const SetUserInfo: React.FC<SetUserInfoProp> = React.memo((props) => {
  const { t } = useI18nNamespaces(['layout'])
  const { userInfo, setStoreUserInfo, avatarColor } = props

  // OSS远程头像删除
  const deleteAvatar = useMemoizedFn((imgName) => {
    httpDeleteOSSResource({ file_name: [imgName] }, true)
      .then(() => {})
      .catch((err) => {
        failed(t('SetUserInfo.avatarUpdateFailed', { error: err }))
      })
  })

  // 修改头像
  const setAvatar = useMemoizedFn(async (file: File) => {
    if (!file.path) {
      failed(t('SetUserInfo.avatarUpdateFailed', { error: 'missing file path' }))
      return
    }
    await ipcRenderer
      .invoke('http-upload-img-path', { path: file.path, type: 'headImg' })
      .then((res) => {
        const imgUrl: string = res.data
        NetWorkApi<API.UpUserInfoRequest, API.ActionSucceeded>({
          method: 'post',
          url: 'urm/up/userinfo',
          data: {
            head_img: imgUrl,
          },
        })
          .then((result) => {
            if (result.ok) {
              success(t('SetUserInfo.avatarUpdateSuccess'))
              setStoreUserInfo({
                ...userInfo,
                companyHeadImg: imgUrl,
              })
              const imgName = imgUrl.split('/').reverse()[0]
              deleteAvatar(imgName)
            }
          })
          .catch((err) => {
            failed(t('SetUserInfo.avatarUpdateFailed', { error: err }))
          })
          .finally(() => {})
      })
      .catch((err) => {
        failed(t('SetUserInfo.avatarUploadFailed'))
      })
      .finally(() => {})
  })
  return (
    <div className="dropdown-menu-user-info">
      <Upload.Dragger
        className="author-upload-dragger"
        accept={FileType.join(',')}
        // accept=".jpg, .jpeg, .png"
        multiple={false}
        maxCount={1}
        showUploadList={false}
        beforeUpload={(f) => {
          if (!FileType.includes(f.type)) {
            failed(t('SetUserInfo.avatarFileTypeLimit', { name: f.name }))
            return false
          }
          setAvatar(f)
          return false
        }}
      >
        <div className="img-box">
          <div className="img-box-mask">{judgeAvatar(userInfo, 40, avatarColor)}</div>
          <CameraOutlined className="hover-icon" />
        </div>
      </Upload.Dragger>
      <div
        className="content-box"
        style={
          userInfo.role !== 'admin'
            ? { display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 16 }
            : {}
        }
      >
        <div className="user-name">{userInfo.companyName}</div>
        {userInfo.role === 'admin' && (
          <>
            <div className="permission-show">{t('SetUserInfo.admin')}</div>
            <span className="user-admin-icon">
              <UsersSolid color="#9D9AFB" size={16} />
            </span>
          </>
        )}
      </div>
    </div>
  )
})
