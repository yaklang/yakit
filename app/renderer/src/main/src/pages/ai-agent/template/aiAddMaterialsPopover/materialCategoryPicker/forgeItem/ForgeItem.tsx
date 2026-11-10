import { lazy, Suspense, useState } from 'react'
import type { FC, ReactElement } from 'react'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import styles from '../MaterialCategoryPicker.module.scss'

const AISkillDetails = lazy(
  () => import('@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/aiSkillList/AISkillDetails/AISkillDetails'),
)

interface ForgeItemProps {
  skillName: string
  children: ReactElement
}

const ForgeItem: FC<ForgeItemProps> = ({ skillName, children }) => {
  const [open, setOpen] = useState(false)

  return (
    <YakitPopover
      trigger="hover"
      destroyOnHidden
      fresh
      open={open}
      onOpenChange={setOpen}
      classNames={{ root: styles['skill-popover'] }}
      content={
        <Suspense fallback={<YakitSpin spinning />}>
          {open && <AISkillDetails source="task-details" name={skillName} />}
        </Suspense>
      }
    >
      {children}
    </YakitPopover>
  )
}

export default ForgeItem
