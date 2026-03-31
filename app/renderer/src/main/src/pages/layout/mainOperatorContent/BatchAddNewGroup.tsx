import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {Checkbox, Col, Row} from "antd"
import React, {useState} from "react"
import {MultipleNodeInfo} from "./MainOperatorContentType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {useMemoizedFn} from "ahooks"
import {CheckboxValueType} from "antd/es/checkbox/Group"
import {yakitNotify} from "@/utils/notification"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export interface BatchAddNewGroupFormItem {
    groupName: string
    groupId?: string
    tabIds: string[]
}
export interface BatchAddNewGroupProp {
    initialValues: BatchAddNewGroupFormItem
    allGroup: MultipleNodeInfo[]
    tabs: MultipleNodeInfo[]
    onFinish: (v: BatchAddNewGroupFormItem) => void
    onCancel: () => void
}
const BatchAddNewGroup: React.FC<BatchAddNewGroupProp> = React.memo((props) => {
    const {initialValues, allGroup, tabs, onFinish, onCancel} = props
    const {t} = useI18nNamespaces(["layout"])
    const [loading, setLoading] = useState<boolean>(false)

    const [groupName, setGroupName] = useState(initialValues.groupName)
    const [groupId, setGroupId] = useState("")
    const handleGroupNameSelect = useMemoizedFn((value) => {
        const matched = allGroup.find((item) => item.id === value)
        if (matched) {
            setGroupName(matched.verbose)
            setGroupId(matched.id)
        } else {
            setGroupId("")
        }
    })
    const handleGroupNameChange = useMemoizedFn((value: string) => {
        setGroupName(value)
        setGroupId("")
    })

    const [checkedTabs, setCheckedTabs] = useState<string[]>(initialValues.tabIds)
    const handleTabsChange = useMemoizedFn((checkedValues: CheckboxValueType[]) => {
        setCheckedTabs([...checkedValues] as string[])
    })

    return (
        <div style={{padding: 15}}>
            <div style={{marginBottom: 5, color: "var(--Colors-Use-Neutral-Text-1-Title)"}}>
                <span style={{color: "#ff4d4f"}}>*</span> {t("BatchAddNewGroup.groupName")}
            </div>
            <YakitAutoComplete
                value={groupName}
                onSelect={handleGroupNameSelect}
                onChange={handleGroupNameChange}
                style={{marginBottom: 16}}
                maxLength={50}
            >
                {allGroup
                    .map((item) => ({label: item.verbose, value: item.id}))
                    .map((item) => {
                        return (
                            <YakitSelect.Option key={item.value} value={item.value}>
                                {item.label}
                            </YakitSelect.Option>
                        )
                    })}
            </YakitAutoComplete>
            <div style={{maxHeight: 300, overflowY: "auto"}}>
                <div style={{marginBottom: 5, color: "var(--Colors-Use-Neutral-Text-1-Title)"}}>
                <span style={{color: "#ff4d4f"}}>*</span> {t("BatchAddNewGroup.addTabsToGroup")}
                </div>
                <Checkbox.Group value={checkedTabs} onChange={handleTabsChange}>
                    {tabs.map((item) => (
                        <YakitCheckbox value={item.id} style={{marginBottom: 5}}>
                            {item.verbose}
                        </YakitCheckbox>
                    ))}
                </Checkbox.Group>
            </div>
            <div style={{textAlign: "right"}}>
                <YakitButton type='outline1' style={{marginRight: 8}} onClick={onCancel}>
                    {t("BatchAddNewGroup.cancel")}
                </YakitButton>
                <YakitButton
                    loading={loading}
                    onClick={() => {
                        if (groupName.length === 0) {
                            yakitNotify("error", t("BatchAddNewGroup.groupNameRequired"))
                            return
                        }

                        if (groupName.length > 50) {
                            yakitNotify("error", t("BatchAddNewGroup.groupNameTooLong"))
                            return
                        }

                        if (checkedTabs.length === 0) {
                            yakitNotify("error", t("BatchAddNewGroup.pleaseSelectTabs"))
                            return
                        }

                        setLoading(true)
                        onFinish({
                            groupName: groupName,
                            groupId: groupId,
                            tabIds: checkedTabs
                        })
                    }}
                >
                    {t("BatchAddNewGroup.confirm")}
                </YakitButton>
            </div>
        </div>
    )
})

export default BatchAddNewGroup
