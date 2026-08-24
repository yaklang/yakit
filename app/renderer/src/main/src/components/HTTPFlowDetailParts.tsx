import type React from 'react'
import { useState } from 'react'
import classNames from 'classnames'
import { useDebounceEffect } from 'ahooks'
import { ChevronDownIcon, ChevronUpIcon } from '@/assets/newIcon'
import { SolidCheckIcon } from '@/assets/icon/solid'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { yakitNotify } from '@/utils/notification'
import { Uint8ArrayToString } from '@/utils/str'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './hTTPFlowDetail.module.scss'

const { ipcRenderer } = window.require('electron')

interface CodingPopoverProps {
  originValue: Uint8Array
  codeKey: string
  onSetCodeLoading: (loading: boolean) => void
  onSetCodeKey: (codeKey: string) => void
  onSetCodeValue: (codeValue: string) => void
}

export const CodingPopover: React.FC<CodingPopoverProps> = (props) => {
  const { originValue, codeKey, onSetCodeKey, onSetCodeValue, onSetCodeLoading } = props
  const { t } = useI18nNamespaces(['history'])
  const [codeShow, setCodeShow] = useState<boolean>(false)

  const fetchNewCodec = (codeVal: string) => {
    const newCodecParams = {
      InputBytes: originValue,
      WorkFlow: [
        {
          CodecType: 'CharsetToUTF8',
          Params: [
            {
              Key: 'charset',
              Value: codeVal,
            },
          ],
        },
      ],
    }
    onSetCodeLoading(true)
    ipcRenderer
      .invoke('NewCodec', newCodecParams)
      .then((data: { Result: string; RawResult: Uint8Array }) => {
        onSetCodeValue(Uint8ArrayToString(data.RawResult))
        onSetCodeKey(codeVal)
      })
      .catch((e) => {
        onSetCodeValue(Uint8ArrayToString(originValue))
        yakitNotify('error', `${e}`)
      })
      .finally(() => {
        setTimeout(() => {
          onSetCodeLoading(false)
        }, 250)
      })
  }

  useDebounceEffect(
    () => {
      if (codeKey) {
        if (codeKey === 'utf-8') {
          onSetCodeValue(Uint8ArrayToString(originValue))
        } else {
          fetchNewCodec(codeKey)
        }
      }
    },
    [originValue],
    {
      wait: 500,
    },
  )

  const handleClickCoding = (codeVal: string) => {
    if (codeKey === codeVal) return
    if (codeVal === 'utf-8') {
      onSetCodeValue(Uint8ArrayToString(originValue))
      onSetCodeKey(codeVal)
    } else {
      fetchNewCodec(codeVal)
    }
  }

  return (
    <YakitPopover
      trigger="click"
      overlayClassName={styles['codec-menu-popover']}
      overlayStyle={{ paddingTop: 2 }}
      placement="bottomLeft"
      content={
        <div className={styles['codec-menu-cont-wrapper']}>
          {[
            { label: 'gb18030', codeKey: 'gb18030' },
            { label: 'windows-1252', codeKey: 'windows-1252' },
            { label: 'iso-8859-1', codeKey: 'iso-8859-1' },
            { label: 'big5', codeKey: 'big5' },
            { label: 'utf-16', codeKey: 'utf-16' },
            { label: 'utf-8', codeKey: 'utf-8' },
          ].map((item) => (
            <div
              key={item.codeKey}
              className={classNames(styles['codec-menu-item'], {
                [styles['active']]: codeKey === item.codeKey,
              })}
              onClick={() => handleClickCoding(item.codeKey)}
            >
              {item.label}
              {codeKey === item.codeKey && <SolidCheckIcon className={styles['check-icon']} />}
            </div>
          ))}
        </div>
      }
      visible={codeShow}
      onVisibleChange={(visible) => setCodeShow(visible)}
    >
      <YakitButton size="small" type={codeKey !== '' ? 'primary' : 'outline2'} onClick={(e) => e.preventDefault()}>
        {t('CodingPopover.encoding')}
        {codeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </YakitButton>
    </YakitPopover>
  )
}
