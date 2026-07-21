import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import React, { useEffect, useMemo, useState } from 'react'
import { OutlineSearchIcon } from '@/assets/outline'
import { isYakit } from '@/utils/envfile'
import classNames from 'classnames'
import styles from './MoreYaklangVersion.module.scss'

interface MoreYaklangVersionProps {
  moreYaklangVersionList: string[]
  onClosePop: (visible: boolean, version: string) => void
}
/** @name 更多Yaklang版本 */
export const MoreYaklangVersion: React.FC<MoreYaklangVersionProps> = React.memo((props) => {
  const { moreYaklangVersionList, onClosePop } = props
  const [versionList, setVersionList] = useState<string[]>(moreYaklangVersionList)
  const [searchVersionVal, setSearchVersionVal] = useState<string>('')
  /** 仅 Yakit 开放轻量版本选择；IRify/Memfit 不展示 */
  const showSlimOption = isYakit()
  const [engineBuildType, setEngineBuildType] = useState<'full' | 'slim'>('full')

  useEffect(() => {
    setVersionList(moreYaklangVersionList)
  }, [moreYaklangVersionList])

  const onSearchVersion = (version: string) => {
    setSearchVersionVal(version)
  }

  const renderVersionList = useMemo(() => {
    const base = !searchVersionVal ? versionList : versionList.filter((v) => v.includes(searchVersionVal))
    // 轻量版仅对正式/预发版本开放（OSS 有 yak-slim_ 产物），过滤掉 dev/ 日常构建
    if (showSlimOption && engineBuildType === 'slim') {
      return base.filter((v) => !v.startsWith('dev'))
    }
    return base
  }, [searchVersionVal, versionList, showSlimOption, engineBuildType])

  const versionListItemClick = (version: string) => {
    const downloadVersion = showSlimOption && engineBuildType === 'slim' ? `slim/${version}` : version
    onClosePop(false, downloadVersion)
  }

  return (
    <div className={styles['more-versions-popover-content']}>
      {showSlimOption && (
        <div className={styles['engine-build-type-header']}>
          <div
            className={classNames(styles['build-type-item'], {
              [styles['build-type-item-active']]: engineBuildType === 'full',
            })}
            onClick={() => setEngineBuildType('full')}
          >
            标准版本
          </div>
          <div
            className={classNames(styles['build-type-item'], {
              [styles['build-type-item-active']]: engineBuildType === 'slim',
            })}
            onClick={() => setEngineBuildType('slim')}
          >
            轻量版本
          </div>
        </div>
      )}
      <div className={styles['search-version-header']}>
        <YakitInput
          value={searchVersionVal}
          size="middle"
          prefix={<OutlineSearchIcon className="search-icon" />}
          onChange={(e) => onSearchVersion(e.target.value.trim())}
        />
      </div>
      <div className={styles['version-list-wrap']}>
        {renderVersionList.length ? (
          <>
            {renderVersionList.map((v) => (
              <div className={styles['version-list-item']} key={v} onClick={() => versionListItemClick(v)}>
                <span className={styles['version-text']}>{v}</span>
                {showSlimOption && engineBuildType === 'slim' ? <span className={styles['slim-tag']}>轻量</span> : null}
              </div>
            ))}
          </>
        ) : (
          <YakitEmpty></YakitEmpty>
        )}
      </div>
    </div>
  )
})
