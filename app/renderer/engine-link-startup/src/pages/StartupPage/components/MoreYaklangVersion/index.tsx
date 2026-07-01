import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import React, { useEffect, useMemo, useState } from 'react'
import { OutlineSearchIcon } from '@/assets/outline'
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
  const [searchVersionList, setSearchVersionList] = useState<string[]>([])

  useEffect(() => {
    setVersionList(moreYaklangVersionList)
  }, [moreYaklangVersionList])

  const onSearchVersion = (version: string) => {
    setSearchVersionVal(version)
    const arr = versionList.filter((v) => v.includes(version))
    setSearchVersionList(arr)
  }

  const renderVersionList = useMemo(() => {
    return searchVersionVal ? searchVersionList : versionList
  }, [searchVersionVal, searchVersionList, versionList])

  const versionListItemClick = (version: string) => {
    onClosePop(false, version)
  }

  return (
    <div className={styles['more-versions-popover-content']}>
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
            {renderVersionList.map((v, index) => (
              <div className={styles['version-list-item']} key={index} onClick={() => versionListItemClick(v)}>
                {v}
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
