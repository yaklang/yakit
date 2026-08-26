import { describe, expect, it } from 'vitest'
import { AIForge } from '@/pages/ai-agent/type/forge'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'
import {
  applyDigitalEmployeeSkillToInputEvent,
  applyForgeNameToStartParams,
  getDigitalEmployeeDefaultMention,
  normalizeForgeVerboseName,
} from '../resolver'

const forge = (item: Partial<AIForge>): AIForge => item as AIForge

describe('digital employee forge resolver', () => {
  it('normalizes empty names safely', () => {
    expect(normalizeForgeVerboseName(undefined)).toBe('')
  })

  it('injects the selected employee ForgeName into start params', () => {
    expect(
      applyForgeNameToStartParams(
        {
          UserQuery: '分析当前风险',
          ForgeName: '',
        },
        'threat-analysis',
      ),
    ).toMatchObject({
      UserQuery: '分析当前风险',
      ForgeName: 'threat-analysis',
    })
  })

  it('maps an employee to the original locked forge mention used by the chat input', () => {
    expect(
      getDigitalEmployeeDefaultMention({
        Id: 18,
        ForgeName: 'threat-analysis',
        ForgeVerboseName: '威胁分析专家',
      }),
    ).toEqual({
      mentionId: '18',
      mentionType: 'forge',
      mentionName: '威胁分析专家',
      lock: true,
    })
  })

  it('sends the employee skill with user-selected resources and removes duplicates', () => {
    const employee = forge({ Id: 1, ForgeName: 'threat-analysis', ForgeVerboseName: '威胁分析专家' })
    const toolResource = {
      Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_AITOOL,
      Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_NAME,
      Value: '端口扫描',
    }

    const withEmployee = applyDigitalEmployeeSkillToInputEvent(
      {
        IsFreeInput: true,
        FreeInput: '分析目标',
        AttachedResourceInfo: [toolResource],
      },
      employee,
    )

    expect(withEmployee.AttachedResourceInfo).toEqual([
      {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_AIFORGE,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_NAME,
        Value: '威胁分析专家',
      },
      toolResource,
    ])
    expect(applyDigitalEmployeeSkillToInputEvent(withEmployee, employee).AttachedResourceInfo).toHaveLength(2)
  })
})
