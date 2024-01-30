import React, {useEffect, useImperativeHandle, useState} from "react"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import styles from "./UpdateGroupList.module.scss"
import {Tooltip} from "antd"

interface UpdateGroupListProps {
    ref: React.Ref<any>
    originGroupList: any // 原始组数据
}

export const UpdateGroupList: React.FC<UpdateGroupListProps> = React.forwardRef((props, ref) => {
    const {originGroupList} = props
    const [groupList, setGroupList] = useState<any>(originGroupList)
    const [searchFlag, setSearchFlag] = useState<boolean>(false)
    const [searchGroupList, setSearchGroupList] = useState<any>([])
    const [addGroupList, setAddGroupList] = useState<any>([])

    useEffect(() => {
        setGroupList(originGroupList)
    }, [originGroupList])

    useImperativeHandle(
        ref,
        () => ({
            latestGroupList: groupList
        }),
        [groupList]
    )

    const getTextWidth = (text: string) => {
        const tempElement = document.createElement("span")
        tempElement.style.cssText = `
          display: inline-block;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      `
        tempElement.textContent = text
        document.body.appendChild(tempElement)
        const width = tempElement.clientWidth
        document.body.removeChild(tempElement)
        return width
    }

    const onSearch = useDebounceFn(
        useMemoizedFn((groupName: string) => {
            if (groupName) {
                const filterList = groupList.filter((item) => item.groupName.includes(groupName))
                if (filterList.length) {
                    setAddGroupList([])
                    setSearchGroupList(filterList)
                } else {
                    setAddGroupList([
                        {
                            groupName,
                            checked: false
                        }
                    ])
                }
                setSearchFlag(true)
            } else {
                setSearchFlag(false)
                setSearchGroupList([])
                setAddGroupList([])
            }
        }),
        {wait: 200}
    ).run

    const changeFiled = (list, groupName, checked: boolean) => {
        const copyList = structuredClone(list)
        copyList.forEach((i) => {
            if (i.groupName === groupName) {
                i.checked = checked
            }
        })
        return copyList
    }

    const onCheckedChange = useMemoizedFn((e, item) => {
        const checked: boolean = e.target.checked
        if (searchFlag) {
            if (addGroupList.length) {
                if (checked) {
                    setGroupList([{groupName: item.groupName, checked}, ...groupList])
                } else {
                    setGroupList(groupList.filter((i) => i.groupName !== item.groupName))
                }
                setAddGroupList(changeFiled(addGroupList, item.groupName, checked))
            } else {
                setSearchGroupList(changeFiled(searchGroupList, item.groupName, checked))
                setGroupList(changeFiled(groupList, item.groupName, checked))
            }
        } else {
            setGroupList(changeFiled(groupList, item.groupName, checked))
        }
    })

    return (
        <div className={styles["add-group-list-wrap"]}>
            <div className={styles["search-heard"]}>
                <YakitInput
                    size='middle'
                    prefix={<OutlineSearchIcon className='search-icon' />}
                    allowClear={true}
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>
            <div className={styles["group-list"]}>
                {searchFlag
                    ? addGroupList.length
                        ? addGroupList.map((item) => (
                              <div className={styles["group-list-item"]}>
                                  <Tooltip title={getTextWidth(item.groupName) > 204 ? item.groupName : ""}>
                                      <YakitCheckbox
                                          wrapperClassName={styles["group-name-wrap"]}
                                          checked={item.checked}
                                          onChange={(e) => onCheckedChange(e, item)}
                                      >
                                          新增分组 "{item.groupName}"
                                      </YakitCheckbox>
                                  </Tooltip>
                              </div>
                          ))
                        : searchGroupList.map((item) => (
                              <div className={styles["group-list-item"]}>
                                  <Tooltip title={getTextWidth(item.groupName) > 204 ? item.groupName : ""}>
                                      <YakitCheckbox
                                          wrapperClassName={styles["group-name-wrap"]}
                                          checked={item.checked}
                                          onChange={(e) => onCheckedChange(e, item)}
                                      >
                                          {item.groupName}
                                      </YakitCheckbox>
                                  </Tooltip>
                              </div>
                          ))
                    : groupList.map((item) => (
                          <div className={styles["group-list-item"]}>
                              <Tooltip title={getTextWidth(item.groupName) > 204 ? item.groupName : ""}>
                                  <YakitCheckbox
                                      wrapperClassName={styles["group-name-wrap"]}
                                      checked={item.checked}
                                      onChange={(e) => onCheckedChange(e, item)}
                                  >
                                      {item.groupName}
                                  </YakitCheckbox>
                              </Tooltip>
                          </div>
                      ))}
            </div>
        </div>
    )
})
