import { useId, useState } from 'react'
import type { RefObject } from 'react'
import type { MentionListControls, MentionRow } from '../type'
import useSwitchSelectByKeyboard from './useSwitchSelectByKeyboard'

export const useMentionRowsKeyboard = (
  scrollRef: RefObject<HTMLDivElement | null>,
  rows: MentionRow[],
  controls:
    | (Pick<MentionListControls, 'getContainer' | 'keyboardEnabled'> & {
        onSelect: (type: MentionRow['type'], item: MentionRow) => void
      })
    | undefined,
  resetKey: string,
  defItemHeight?: number,
) => {
  const listId = useId()
  const [selection, setSelection] = useState<{ key: string; resetKey: string }>()
  const rowKey = (item: MentionRow) => `${listId}-${item.row.kind}-${item.id}`
  const selected = (selection?.resetKey === resetKey && rows.find((item) => rowKey(item) === selection.key)) || rows[0]
  const pick = (item: MentionRow) => controls?.onSelect(item.type, item)

  useSwitchSelectByKeyboard(scrollRef, {
    data: rows,
    selected,
    rowKey,
    getContainer: controls?.getContainer,
    enabled: rows.length > 0 && !!controls && controls.keyboardEnabled !== false,
    defItemHeight,
    onSelectNumber: (index) => {
      const item = rows[index]
      if (item) setSelection({ key: rowKey(item), resetKey })
    },
    onEnter: () => {
      if (selected) pick(selected)
    },
  })

  return (item: MentionRow) => ({
    id: rowKey(item),
    active: selected === item,
    onSelect: () => pick(item),
  })
}
