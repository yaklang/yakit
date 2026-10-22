import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { grpcGetAIForge } from '@/pages/ai-agent/grpc'
import { getCodeByPath } from '@/pages/yakRunner/utils'
import type { AISkillDetailsProps } from './type'
import styles from './AISkillDetails.module.scss'

const AISkillDetails: FC<AISkillDetailsProps> = ({ name }) => {
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState<string>()

  useEffect(() => {
    let active = true
    let loadingTimer: ReturnType<typeof setTimeout> | undefined
    const loadSkill = async () => {
      setLoading(true)
      setValue(undefined)
      try {
        const forge = await grpcGetAIForge({ ForgeName: name, InflateSkillPath: true })
        if (!active || !forge.SkillPath) return
        const separator = forge.SkillPath.includes('\\') && !forge.SkillPath.includes('/') ? '\\' : '/'
        const path = `${forge.SkillPath}${forge.SkillPath.endsWith(separator) ? '' : separator}SKILL.md`
        const content = await getCodeByPath(path)
        if (active) setValue(content)
      } catch {
        if (active) setValue(undefined)
      } finally {
        if (active)
          loadingTimer = setTimeout(() => {
            if (active) setLoading(false)
          }, 500)
      }
    }

    void loadSkill()
    return () => {
      active = false
      clearTimeout(loadingTimer)
    }
  }, [name])

  return (
    <div className={styles['skill-details']}>
      <div className={styles['editor-container']}>
        <YakitSpin spinning={loading}>
          {value ? <YakitEditor value={value} type="markdown" readOnly={true} /> : <YakitEmpty />}
        </YakitSpin>
      </div>
    </div>
  )
}

export default AISkillDetails
