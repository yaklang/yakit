import threatAnalyst from '@/assets/newAssets/senso-agent-01-portrait-hd.png'
import threatAnalystBadge from '@/assets/newAssets/senso-agent-01-badge.png'
import penetrationTester from '@/assets/newAssets/senso-agent-02-portrait-hd.png'
import penetrationTesterBadge from '@/assets/newAssets/senso-agent-02-badge.png'
import operationsManager from '@/assets/newAssets/senso-agent-03-portrait-hd.png'
import operationsManagerBadge from '@/assets/newAssets/senso-agent-03-badge.png'
import digitalHunter from '@/assets/newAssets/senso-agent-04-portrait-hd.png'
import digitalHunterBadge from '@/assets/newAssets/senso-agent-04-badge.png'
import intelligenceOfficer from '@/assets/newAssets/senso-agent-05-portrait-hd.png'
import intelligenceOfficerBadge from '@/assets/newAssets/senso-agent-05-badge.png'
import ciso from '@/assets/newAssets/senso-agent-06-portrait-hd.png'
import cisoBadge from '@/assets/newAssets/senso-agent-06-badge.png'
import digitalTeacher from '@/assets/newAssets/senso-agent-07-portrait-hd.png'
import digitalTeacherBadge from '@/assets/newAssets/senso-agent-07-badge.png'
import incidentResponder from '@/assets/newAssets/senso-agent-08-portrait-hd.png'
import incidentResponderBadge from '@/assets/newAssets/senso-agent-08-badge.png'

export interface DigitalEmployeeDefinition {
  id: string
  order: number
  name: string
  forgeVerboseName: string
  description: string
  cardDescription: string
  skills: string[]
  portrait: string
  badge: string
  accent: string
}

export const DIGITAL_EMPLOYEES: DigitalEmployeeDefinition[] = [
  {
    id: 'threat-analyst',
    order: 1,
    name: '威胁分析专家',
    forgeVerboseName: '威胁分析专家',
    description: '专注威胁检测、分析与研判，快速识别并响应潜在安全风险。',
    cardDescription: '专注威胁检测、分析与研判',
    skills: ['威胁检测', '漏洞分析', '恶意样本分析', '情报研判', '异常流量分析'],
    portrait: threatAnalyst,
    badge: threatAnalystBadge,
    accent: '#1478ff',
  },
  {
    id: 'penetration-tester',
    order: 2,
    name: '渗透测试专家',
    forgeVerboseName: '渗透测试专家',
    description: '模拟真实攻击路径，发现系统薄弱点并给出可执行的修复建议。',
    cardDescription: '模拟攻击、发现系统漏洞',
    skills: ['渗透测试', '漏洞挖掘', '攻击路径', '弱点验证'],
    portrait: penetrationTester,
    badge: penetrationTesterBadge,
    accent: '#4277ff',
  },
  {
    id: 'operations-manager',
    order: 3,
    name: '运营服务管家',
    forgeVerboseName: '运营服务管家',
    description: '面向安全运营全流程，统一梳理风险、告警、任务和服务状态。',
    cardDescription: '安全运营全流程管理',
    skills: ['安全运营', '告警处置', '风险分析', '服务管理'],
    portrait: operationsManager,
    badge: operationsManagerBadge,
    accent: '#735cff',
  },
  {
    id: 'digital-hunter',
    order: 4,
    name: '数字猎手',
    forgeVerboseName: '数字猎手',
    description: '主动狩猎隐蔽威胁，从海量线索中定位潜伏风险和异常行为。',
    cardDescription: '主动狩猎、发现潜在风险',
    skills: ['威胁狩猎', '线索分析', '异常检测', '风险排查'],
    portrait: digitalHunter,
    badge: digitalHunterBadge,
    accent: '#2b91ff',
  },
  {
    id: 'intelligence-officer',
    order: 5,
    name: '数字情报官',
    forgeVerboseName: '数字情报官',
    description: '持续搜集、关联和研判安全情报，为风险决策提供及时依据。',
    cardDescription: '威胁情报搜集与分析',
    skills: ['威胁情报', '情报搜集', '关联分析', '趋势研判'],
    portrait: intelligenceOfficer,
    badge: intelligenceOfficerBadge,
    accent: '#178bd8',
  },
  {
    id: 'ciso',
    order: 6,
    name: '首席信息安全官',
    forgeVerboseName: '首席信息安全官',
    description: '从组织视角规划安全体系，辅助完成风险决策与安全治理。',
    cardDescription: '安全战略规划与决策',
    skills: ['安全战略', '风险治理', '合规管理', '决策支持'],
    portrait: ciso,
    badge: cisoBadge,
    accent: '#316ff6',
  },
  {
    id: 'digital-teacher',
    order: 7,
    name: '数字教师',
    forgeVerboseName: '数字教师',
    description: '以清晰易懂的方式讲解安全知识，提供训练、答疑与能力提升。',
    cardDescription: '安全知识培训与提升',
    skills: ['安全培训', '知识答疑', '案例教学', '能力评估'],
    portrait: digitalTeacher,
    badge: digitalTeacherBadge,
    accent: '#13a8a8',
  },
  {
    id: 'incident-responder',
    order: 8,
    name: '应急响应专家',
    forgeVerboseName: '应急响应专家',
    description: '快速研判安全事件，制定处置流程并协助完成恢复与复盘。',
    cardDescription: '快速响应、处置安全事件',
    skills: ['事件响应', '应急处置', '溯源分析', '恢复复盘'],
    portrait: incidentResponder,
    badge: incidentResponderBadge,
    accent: '#3a7afe',
  },
]

export const getDigitalEmployeeById = (id?: string) => {
  return DIGITAL_EMPLOYEES.find((employee) => employee.id === id)
}
