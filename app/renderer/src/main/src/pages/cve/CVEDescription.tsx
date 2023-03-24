import { Descriptions, Tag } from 'antd';
import { CVEDetail } from "@/pages/cve/models";
import classNames from 'classnames';
import styles from "./CVETable.module.scss";
import { useCreation } from 'ahooks';
import moment from 'moment';

export const CVEDescription = ({
    CVE,
    DescriptionZh,
    DescriptionOrigin,
    Title,
    Solution,
    AccessVector,
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
    Product,
}: CVEDetail) => {
    const color = useCreation(() => {
        let text = "success";
        if (BaseCVSSv2Score > 8.0 || Severity === "CRITICAL" || Severity === "HIGH") {
            text = "danger"
        } else if (BaseCVSSv2Score > 6.0) {
            text = "warning"
        }
        return text
    }, [BaseCVSSv2Score, Severity, Severity])

    return <>

        <Descriptions bordered size="small" column={3}>
            <Descriptions.Item label="CVE编号" span={2} contentStyle={{ fontSize: 16, fontWeight: 'bold' }}>{CVE}</Descriptions.Item>
            <Descriptions.Item label="漏洞级别" span={1}>
                <div className={classNames(styles['cve-list-product-success'], styles['cve-description-product-success'], {
                    [styles['cve-list-product-warning']]: color === "warning",
                    [styles['cve-list-product-danger']]: color === "danger",
                })}>
                    <div className={classNames(styles['cve-list-severity'])}>{Severity}</div>
                    <span className={classNames(styles['cve-list-baseCVSSv2Score'])}>{BaseCVSSv2Score}</span>
                </div>
            </Descriptions.Item>
            <Descriptions.Item label="标题" span={2} >{Title}</Descriptions.Item>
            <Descriptions.Item label="披露时间" span={1}>{moment.unix(PublishedAt).format('YYYY/MM/DD')}</Descriptions.Item>
            <Descriptions.Item label="漏洞总结" span={3}>
                {DescriptionZh || DescriptionOrigin}
            </Descriptions.Item>

            <Descriptions.Item label="利用路径" span={2}>
                {AccessVector}
            </Descriptions.Item>
            <Descriptions.Item label="利用难度" span={2}>
                <div className={classNames(styles['cve-list-product-success'], styles['cve-description-product-success'], {
                    [styles['cve-list-product-warning']]: AccessComplexity === "MIDDLE",
                    [styles['cve-list-product-danger']]: AccessComplexity === "HEIGHT",
                })}>
                    <div className={classNames(styles['cve-list-severity'])}>{AccessComplexity}</div>
                    <span className={classNames(styles['cve-list-baseCVSSv2Score'])}>{ExploitabilityScore}</span>
                </div>
            </Descriptions.Item>
            <Descriptions.Item label="影响产品" span={3}>{Product}</Descriptions.Item>

            <Descriptions.Item label="利用情况" span={3}>
                {CVSSVectorString}
            </Descriptions.Item>

            <Descriptions.Item label="解决方案" span={3}>
                {Solution}
            </Descriptions.Item>
        </Descriptions>
        <div className={styles['no-more']}>暂无更多</div>
    </>
};