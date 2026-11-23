import type { FC } from 'react'
import { useCompactSummaryLabels } from '../useCompactSummaryLabels'
import type { InputSummaryRowProps } from './type'
import styles from './InputSummaryRow.module.scss'

const InputSummaryRow: FC<InputSummaryRowProps> = ({ children }) => {
  const rowRef = useCompactSummaryLabels()

  return (
    <div ref={rowRef} className={styles.row} data-ai-summary-row>
      {children}
    </div>
  )
}

export default InputSummaryRow
