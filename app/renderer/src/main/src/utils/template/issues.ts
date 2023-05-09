import {LocalInfoProps} from "@/components/layout/UILayout";

export const ReportBug = (system_info?: LocalInfoProps): string => {
    let tpl = `
## 问题描述

请在此处提供您遇到的问题的详细描述。请描述问题的表现、发生的频率、影响范围以及任何其他相关信息。如果可能，请提供具体的步骤来重现该问题。

## 预期行为

请在此处描述您预期的行为，也就是问题被解决后应该出现的结果。如果可能，请提供具体的结果示例。

## 实际行为

请在此处描述您实际看到的行为，也就是问题解决后出现的结果。如果可能，请提供具体的结果示例。

## 复现步骤

请在此处提供能够复现该问题的具体步骤。如果问题是随机发生的，或者需要特定的环境条件才能复现，请提供更详细的说明。

1. 步骤 1
2. 步骤 2
3. 步骤 3

## 环境信息

- 操作系统: ${system_info?.system}
- 系统架构: ${system_info?.arch}
- Yakit 版本: ${system_info?.localYakit}
- YakLang 版本: ${system_info?.localYaklang}

## 补充说明

如果您有任何其他有关该问题的信息或评论，请在此处添加。

`
    tpl = encodeURIComponent(tpl)
    return tpl

}
export const FeatureRequest = (): string => {
    let tpl = `
## 需求描述

请清晰明确地描述你遇到的问题，例如：我在使用该产品时总是遇到以下问题...

## 解决方案

请清晰明确地描述你希望达成的目标和解决方案，例如：我希望产品能够实现以下功能...

## 可选方案

请清晰明确地描述你考虑过的其他方案或功能。

## 附加信息

请提供任何与该功能请求相关的上下文信息、截图或其他材料等。
`
    tpl = encodeURIComponent(tpl)
    return tpl
}