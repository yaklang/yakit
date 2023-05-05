import {Descriptions, List, Tabs} from "antd"
import {CVEDetail, CWEDetail} from "@/pages/cve/models"
import classNames from "classnames"
import "../main.scss"
import "../MainTabs.scss"
import styles from "./CVETable.module.scss"
import {useCreation} from "ahooks"
import moment from "moment"
import React, {ReactNode} from "react"

const {TabPane} = Tabs

export const CVEDescription = React.memo(
    ({
         CVE,
         DescriptionZh,
         DescriptionOrigin,
         Title,
         Solution,
         AccessVector,
         References,
         AccessComplexity,
         ConfidentialityImpact,
         IntegrityImpact,
         AvailabilityImpact,
         PublishedAt,
         CWE,
         Severity,
         CVSSVectorString,
         BaseCVSSv2Score,
         ExploitabilityScore,
         Product
     }: CVEDetail) => {

        const color = useCreation(() => {
            let text = "success"
            if (Severity === "严重") {
                text = "serious"
            }
            if (Severity === "高危") {
                text = "danger"
            }
            if (Severity === "中危") {
                text = "warning"
            }
            return text
        }, [BaseCVSSv2Score, Severity, Severity])
        return (
            <div className={styles["description-content"]}>
                <Descriptions bordered size='small' column={3}>
                    <Descriptions.Item label='CVE编号' span={2} contentStyle={{fontSize: 16, fontWeight: "bold"}}>
                        {CVE||"-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='漏洞级别' span={1} contentStyle={{minWidth: 110}}>
                        {Severity === "-" ? (
                            "-"
                        ) : (
                            <div
                                className={classNames(
                                    styles["cve-list-product-success"],
                                    styles["cve-description-product-success"],
                                    {
                                        [styles["cve-list-product-warning"]]: color === "warning",
                                        [styles["cve-list-product-danger"]]: color === "danger",
                                        [styles["cve-list-product-serious"]]: color === "serious"
                                    }
                                )}
                            >
                                <div className={classNames(styles["cve-list-severity"])}>{Severity}</div>
                                <span className={classNames(styles["cve-list-baseCVSSv2Score"])}>
                                    {BaseCVSSv2Score}
                                </span>
                            </div>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label='标题' span={2}>
                        {Title||"-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='披露时间' span={1}>
                        {moment.unix(PublishedAt).format("YYYY/MM/DD")}
                    </Descriptions.Item>
                    <Descriptions.Item label='漏洞总结' span={3}>
                        {DescriptionZh || DescriptionOrigin ||"-"}
                    </Descriptions.Item>

                    <Descriptions.Item label='利用路径' span={2}>
                        {AccessVector||"-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='利用难度' span={2}>
                        {AccessComplexity === "-" ? (
                            "-"
                        ) : (
                            <div
                                className={classNames(
                                    styles["cve-list-product-success"],
                                    styles["cve-description-product-success"],
                                    {
                                        [styles["cve-list-product-warning"]]: AccessComplexity === "一般",
                                        [styles["cve-list-product-danger"]]: AccessComplexity === "困难"
                                    }
                                )}
                            >
                                <div className={classNames(styles["cve-list-severity"])}>{AccessComplexity}</div>
                                <span className={classNames(styles["cve-list-baseCVSSv2Score"])}>
                                    {ExploitabilityScore}
                                </span>
                            </div>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label='影响产品' span={3}>
                        {Product||"-"}
                    </Descriptions.Item>

                    <Descriptions.Item label='解决方案' span={3}>
                        {Solution||"-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='参考链接' span={3} style={{whiteSpace: "pre"}}>
                        {References||"-"}
                    </Descriptions.Item>
                </Descriptions>
                <div className={styles["no-more"]}>暂无更多</div>
            </div>
        )
    }
)
interface CWEDescriptionProps {
    data: CWEDetail[]
    tabBarExtraContent: ReactNode
    onSelectCve: (s: string) => void
}
export const CWEDescription: React.FC<CWEDescriptionProps> = React.memo((props) => {
    const {data, tabBarExtraContent, onSelectCve} = props

    return (
        <>
            <Tabs
                defaultActiveKey={data[0]?.CWE || "-"}
                size='small'
                type='card'
                className={classNames(styles["cwe-tabs"], "main-content-tabs", "yakit-layout-tabs")}
                // className={styles["cwe-tabs"]}
                tabBarExtraContent={tabBarExtraContent}
            >
                {data.map((i: CWEDetail) => (
                    <TabPane tab={i.CWE} key={i.CWE}>
                        <CWEDescriptionItem item={i} onSelectCve={onSelectCve} />
                        <div className={styles["no-more"]}>暂无更多</div>
                    </TabPane>
                ))}
            </Tabs>
        </>
    )
})
interface CWEDescriptionItemProps {
    item: CWEDetail
    onSelectCve: (s: string) => void
}
export const CWEDescriptionItem: React.FC<CWEDescriptionItemProps> = React.memo((props) => {
    const {item, onSelectCve} = props
    return (
        <Descriptions bordered size='small' column={3}>
            <Descriptions.Item label={"CWE编号"} span={2} contentStyle={{fontSize: 16, fontWeight: "bold"}}>
                {item.CWE || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"CWE 状态"} span={1}>
                {item.Status || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"类型"} span={3}>
                {item.NameZh || item.Name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"描述信息"} span={3}>
                {item.DescriptionZh || item.Description || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"修复方案"} span={3}>
                {item.Solution || "-"}
            </Descriptions.Item>
            <Descriptions.Item label={"其他案例"} span={3} contentStyle={{paddingBottom: 8}}>
                {item.RelativeCVE.map((c) => (
                    <div key={c} className={styles["cwe-tag"]} onClick={() => onSelectCve(c)}>
                        {c}
                    </div>
                ))}
            </Descriptions.Item>
        </Descriptions>
    )
})
