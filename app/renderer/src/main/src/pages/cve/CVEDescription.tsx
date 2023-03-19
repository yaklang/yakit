import {Descriptions, Tag} from 'antd';
import {CVEDetail} from "@/pages/cve/models";

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
    return <div>
        <Descriptions bordered column={2}>
            <Descriptions.Item label={
                <Tag>CVE</Tag>
            } span={1}>{CVE}</Descriptions.Item>
            <Descriptions.Item label={
                <Tag>漏洞级别</Tag>
            }>
                <Tag>{Severity}</Tag>
                <Tag>{BaseCVSSv2Score}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="漏洞总结" span={2}>{Title}</Descriptions.Item>
            <Descriptions.Item label="利用方式" span={1}>
                {AccessVector}
                <Tag>利用评分：{ExploitabilityScore}({AccessComplexity})</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="CVSS:Vector" span={1}>
                {CVSSVectorString}
            </Descriptions.Item>

            <Descriptions.Item label="关联产品" span={2}>{Product}</Descriptions.Item>
            <Descriptions.Item label="漏洞描述" span={2}>
                {DescriptionZh || DescriptionOrigin}
            </Descriptions.Item>
            <Descriptions.Item label="漏洞修复" span={2}>
                {Solution}
            </Descriptions.Item>
            <Descriptions.Item label="CWE" span={2}>
                {CWE}
            </Descriptions.Item>
        </Descriptions>
    </div>
};