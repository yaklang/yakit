import { useCallback } from 'react'
import { useResourceSelection } from '@/components/useResourceSelection'
import type { Risk } from '@/pages/risks/schema'

const EMPTY_SELECTION: string[] = []

export const useRiskSelection = (inViewPort: boolean, sessionId?: string) => {
  const { selectedIds, onChangeSelectedIds, clearSelection } = useResourceSelection(inViewPort, sessionId)
  const onRiskSelectionChange = useCallback(
    (rows: Risk[], checked: boolean) =>
      onChangeSelectedIds(
        rows.map((row) => String(row.Id)),
        checked,
      ),
    [onChangeSelectedIds],
  )

  return {
    selectedRiskIds: selectedIds ?? EMPTY_SELECTION,
    setSelectedRiskIds: onChangeSelectedIds,
    onRiskSelectionChange,
    clearRiskSelection: clearSelection,
  }
}
