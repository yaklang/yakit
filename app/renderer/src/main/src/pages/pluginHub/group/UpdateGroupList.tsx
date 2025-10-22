import React, {useEffect, useImperativeHandle, useState} from "react"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useMemoizedFn} from "ahooks"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {Tooltip} from "antd"
import styles from "./UpdateGroupList.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export interface UpdateGroupListItem {
    groupName: string
    checked: boolean
}

interface UpdateGroupListProps {
    ref: React.Ref<any>
    originGroupList: UpdateGroupListItem[] // 原始组数据
    onOk: () => void
    onCanle: () => void
}

export const UpdateGroupList: React.FC<UpdateGroupListProps> = React.forwardRef((props, ref) => {
    const {originGroupList, onOk, onCanle} = props
    const {t, i18n} = useI18nNamespaces(["plugin", "yakitUi"])
    const [groupList, setGroupList] = useState<UpdateGroupListItem[]>([])
    const [searchFlag, setSearchFlag] = useState<boolean>(false)
    const [searchVal, setSearchVal] = useState<string>("")
    const [searchGroupList, setSearchGroupList] = useState<UpdateGroupListItem[]>([])
    const [addGroupList, setAddGroupList] = useState<UpdateGroupListItem[]>([])

    useEffect(() => {
        setGroupList(structuredClone(originGroupList))
        resetSearch()
    }, [originGroupList])

    useImperativeHandle(
        ref,
        () => ({
            latestGroupList: groupList
        }),
        [groupList]
    )

    const onSearch = useMemoizedFn((groupName: string) => {
        if (groupName) {
            setSearchVal(groupName)
            const filterList = groupList.filter((item) => item.groupName === groupName)
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
            resetSearch()
        }
    })

    const resetSearch = () => {
        setSearchVal("")
        setSearchFlag(false)
        setSearchGroupList([])
        setAddGroupList([])
    }

    const changeFiled = (list: UpdateGroupListItem[], groupName: string, checked: boolean) => {
        const copyList = structuredClone(list)
        copyList.forEach((i) => {
            if (i.groupName === groupName) {
                i.checked = checked
            }
        })
        return copyList
    }

    const onCheckedChange = useMemoizedFn((checked: boolean, groupName: string, newAddFlag) => {
        if (searchFlag) {
            if (addGroupList.length) {
                if (checked) {
                    setGroupList([{groupName: groupName, checked}, ...groupList])
                } else {
                    setGroupList(groupList.filter((i) => i.groupName !== groupName))
                }
                setAddGroupList(changeFiled(addGroupList, groupName, checked))
            } else {
                setSearchGroupList(changeFiled(searchGroupList, groupName, checked))
                setGroupList(changeFiled(groupList, groupName, checked))
            }
        } else {
            setGroupList(changeFiled(groupList, groupName, checked))
        }

        // 新增组 需要清除搜索的值
        if (newAddFlag) {
            resetSearch()
        }
    })

    return (
        <div className={styles["add-group-list-wrap"]}>
            <div className={styles["search-heard-text"]}>{t("UpdateGroupList.groupCheckboxTip")}</div>
            <div className={styles["search-heard"]}>
                <YakitInput
                    placeholder={t("UpdateGroupList.addToGroup")}
                    value={searchVal}
                    size='middle'
                    prefix={<OutlineSearchIcon className='search-icon' />}
                    allowClear
                    onChange={(e) => onSearch(e.target.value.trim())}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.stopPropagation()
                            if (searchFlag && addGroupList.length) {
                                onCheckedChange(true, searchVal, true)
                            }
                        }
                    }}
                />
            </div>
            <div className={styles["group-list"]}>
                {searchFlag
                    ? addGroupList.length
                        ? addGroupList.map((item) => (
                              <div className={styles["group-list-item"]} key={item.groupName}>
                                  <Tooltip title={`${t("UpdateGroupList.newGroup")} “${item.groupName}"`}>
                                      <YakitCheckbox
                                          wrapperClassName={styles["group-name-wrap"]}
                                          checked={item.checked}
                                          onChange={(e) => onCheckedChange(e.target.checked, item.groupName, true)}
                                      >
                                          {t("UpdateGroupList.newGroup")} “{item.groupName}"
                                      </YakitCheckbox>
                                  </Tooltip>
                              </div>
                          ))
                        : searchGroupList.map((item) => (
                              <div className={styles["group-list-item"]} key={item.groupName}>
                                  <Tooltip title={item.groupName}>
                                      <YakitCheckbox
                                          wrapperClassName={styles["group-name-wrap"]}
                                          checked={item.checked}
                                          onChange={(e) => onCheckedChange(e.target.checked, item.groupName, false)}
                                      >
                                          {item.groupName}
                                      </YakitCheckbox>
                                  </Tooltip>
                              </div>
                          ))
                    : groupList.map((item) => (
                          <div className={styles["group-list-item"]} key={item.groupName}>
                              <Tooltip title={item.groupName}>
                                  <YakitCheckbox
                                      wrapperClassName={styles["group-name-wrap"]}
                                      checked={item.checked}
                                      onChange={(e) => onCheckedChange(e.target.checked, item.groupName, false)}
                                  >
                                      {item.groupName}
                                  </YakitCheckbox>
                              </Tooltip>
                          </div>
                      ))}
            </div>
            <div className={styles["add-group-footer"]}>
                <div className={styles["add-group-footer-btns"]}>
                    <YakitButton type='outline2' onClick={onCanle}>
                        {t("YakitButton.cancel")}
                    </YakitButton>
                    <YakitButton type='primary' onClick={onOk}>
                        {t("YakitButton.confirm")}
                    </YakitButton>
                </div>
            </div>
        </div>
    )
})
