import React, {useState} from "react"
import {RiskTable} from "./RiskTable"
import {
    IPItemProps,
    IPListItemProps,
    IPListProps,
    RiskPageProp,
    RiskQueryProps,
    VulnerabilityLevelProps,
    VulnerabilityTypeProps
} from "./RiskPageType"
import styles from "./RiskPage.module.scss"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {Divider} from "antd"
import classNames from "classnames"
import {VulnerabilityLevelPie} from "./VulnerabilityLevelPie/VulnerabilityLevelPie"

export const RiskPage: React.FC<RiskPageProp> = (props) => {
    const [advancedQuery, setAdvancedQuery] = useState(true)
    const [query, setQuery] = useState()
    return (
        <div className={styles["risk-page"]}>
            <RiskQuery advancedQuery={advancedQuery} setAdvancedQuery={setAdvancedQuery} />
            {/* <RiskTable /> */}
            <div style={{padding: 12}}>55</div>
        </div>
    )
}

const RiskQuery: React.FC<RiskQueryProps> = React.memo((props) => {
    const {advancedQuery, setAdvancedQuery} = props
    return (
        <div className={styles["risk-query"]}>
            <div className={styles["risk-query-heard"]}>
                <span>高级查询</span>
                <YakitSwitch checked={advancedQuery} onChange={setAdvancedQuery} />
            </div>
            <div className={styles["risk-query-body"]}>
                <IPList />
                <Divider style={{margin: "8px 0px"}} />
                <VulnerabilityLevel />
                <Divider style={{margin: "8px 0px"}} />
                <VulnerabilityType />
            </div>
        </div>
    )
})

const getData = () => {
    const data: IPItemProps[] = []
    for (let index = 0; index < 100; index++) {
        data.push({
            value: index,
            label: `IP${index}`
        })
    }
    return data
}
const IPList: React.FC<IPListProps> = React.memo((props) => {
    const [data, setData] = useState<IPItemProps[]>(getData())
    const onReset = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    const onSelect = useMemoizedFn(() => {})
    return (
        <div className={styles["ip-list-body"]}>
            <div className={styles["ip-list-heard"]}>
                <div className={styles["ip-list-heard-title"]}>IP 统计</div>
                <YakitButton
                    type='text'
                    colors='danger'
                    className={styles["btn-padding-right-0"]}
                    onClick={onReset}
                    size='small'
                >
                    重置
                </YakitButton>
            </div>
            <div className={styles["ip-list-content"]}>
                <RollingLoadList<IPItemProps>
                    data={data}
                    page={-1}
                    hasMore={false}
                    loadMoreData={() => {}}
                    loading={false}
                    rowKey='value'
                    defItemHeight={24}
                    renderRow={(record, index: number) => <IPListItem item={record} onSelect={onSelect} />}
                />
            </div>
        </div>
    )
})
const IPListItem: React.FC<IPListItemProps> = React.memo((props) => {
    const {item, onSelect} = props
    return (
        <div
            className={classNames(styles["ip-list-item"], {
                [styles["ip-list-item-active"]]: item.value === 3
            })}
            onClick={() => onSelect(item)}
        >
            <div className={styles["ip-list-item-label"]}>{item.label}</div>
            <div className={styles["ip-list-item-value"]}>{item.value}</div>
        </div>
    )
})
/**漏洞等级 */
const VulnerabilityLevel: React.FC<VulnerabilityLevelProps> = React.memo((props) => {
    const onReset = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    return (
        <div className={styles["vulnerability-level"]}>
            <div className={styles["vulnerability-level-heard"]}>
                <div className={styles["vulnerability-level-heard-title"]}>漏洞等级</div>
                <YakitButton
                    type='text'
                    colors='danger'
                    className={styles["btn-padding-right-0"]}
                    onClick={onReset}
                    size='small'
                >
                    重置
                </YakitButton>
            </div>
            <VulnerabilityLevelPie />
        </div>
    )
})

const VulnerabilityType: React.FC<VulnerabilityTypeProps> = React.memo((props) => {
    const onReset = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    return (
        <div className={styles["vulnerability-type"]}>
            <div className={styles["vulnerability-type-heard"]}>
                <div className={styles["vulnerability-type-heard-title"]}>漏洞类型 Top 10</div>
                <YakitButton
                    type='text'
                    colors='danger'
                    className={styles["btn-padding-right-0"]}
                    onClick={onReset}
                    size='small'
                >
                    重置
                </YakitButton>
            </div>
        </div>
    )
})
