import { useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { MentionListControls, MentionRow } from '../type'
import { resolveMentionPointerSelect, type MentionPointerModifiers } from './mentionMultiSelect'
import useSwitchSelectByKeyboard from './useSwitchSelectByKeyboard'

export const useMentionRowsKeyboard = (
  scrollRef: RefObject<HTMLDivElement | null>,
  rows: MentionRow[],
  controls:
    | (Pick<
        MentionListControls,
        'getContainer' | 'extraContainer' | 'keyboardEnabled' | 'onSelectMany' | 'onModifierPointer'
      > & {
        onSelect: (type: MentionRow['type'], item: MentionRow) => void
      })
    | undefined,
  resetKey: string,
  defItemHeight?: number,
) => {
  const listId = useId()
  const [selection, setSelection] = useState<{ key: string; resetKey: string }>()
  const [multi, setMulti] = useState<{ resetKey: string; keys: string[]; anchorKey: string }>()
  const rowKey = (item: MentionRow) => `${listId}-${item.row.kind}-${item.id}`
  const selected = (selection?.resetKey === resetKey && rows.find((item) => rowKey(item) === selection.key)) || rows[0]
  const multiActive = multi?.resetKey === resetKey
  const checkedKeys = multiActive ? multi.keys : []
  const keyboardOn = !!controls && controls.keyboardEnabled !== false
  // 只有面板接下了 Ctrl/Shift 点击的列表才允许多选。场景列表没有该回调，保持单选。
  const allowMulti = keyboardOn && !!controls.onModifierPointer
  const onModifierPointer = controls?.onModifierPointer
  const rowsRef = useRef(rows)
  const checkedKeysRef = useRef(checkedKeys)
  const selectedRef = useRef(selected)
  const multiRef = useRef(multi)
  const resetKeyRef = useRef(resetKey)
  rowsRef.current = rows
  checkedKeysRef.current = checkedKeys
  selectedRef.current = selected
  multiRef.current = multi
  resetKeyRef.current = resetKey

  useEffect(() => {
    if (!onModifierPointer || !allowMulti) return
    onModifierPointer.current = (rowId, modifiers) => {
      const currentRows = rowsRef.current
      const currentMulti = multiRef.current
      const key = resetKeyRef.current
      const multiOn = currentMulti?.resetKey === key
      const currentSelected = selectedRef.current
      const item = currentRows.find((row) => rowKey(row) === rowId)
      if (!item) return
      const next = resolveMentionPointerSelect({
        orderedKeys: currentRows.map(rowKey),
        checkedKeys: checkedKeysRef.current,
        anchorKey: multiOn ? currentMulti?.anchorKey : currentSelected ? rowKey(currentSelected) : undefined,
        clickedKey: rowKey(item),
        modifiers,
      })
      if (!next) return
      setMulti({ resetKey: key, keys: next.checkedKeys, anchorKey: next.anchorKey })
      setSelection({ key: rowKey(item), resetKey: key })
    }
    return () => {
      onModifierPointer.current = undefined
    }
  }, [onModifierPointer, allowMulti])

  const commit = (items: MentionRow[]) => {
    if (!controls || !items.length) return
    if (items.length > 1 && controls.onSelectMany) {
      controls.onSelectMany(items)
      return
    }
    items.forEach((item) => controls.onSelect(item.type, item))
  }

  useSwitchSelectByKeyboard(scrollRef, {
    data: rows,
    selected,
    rowKey,
    getContainer: controls?.getContainer,
    extraContainer: controls?.extraContainer,
    enabled: rows.length > 0 && keyboardOn,
    defItemHeight,
    onSelectNumber: (index) => {
      const item = rows[index]
      if (item) setSelection({ key: rowKey(item), resetKey })
    },
    onEnter: () => {
      if (multiActive) {
        const picked = new Set(checkedKeys)
        const items = rows.filter((item) => picked.has(rowKey(item)))
        if (items.length) {
          commit(items)
          return
        }
      }
      if (selected) commit([selected])
    },
    onCtrlEnter: allowMulti
      ? () => {
          if (!selected) return
          const next = resolveMentionPointerSelect({
            orderedKeys: rows.map(rowKey),
            checkedKeys,
            anchorKey: multiActive ? multi.anchorKey : rowKey(selected),
            clickedKey: rowKey(selected),
            modifiers: { ctrlKey: true },
          })
          if (!next) return
          setMulti({ resetKey, keys: next.checkedKeys, anchorKey: next.anchorKey })
          setSelection({ key: rowKey(selected), resetKey })
        }
      : undefined,
  })

  return (item: MentionRow) => ({
    id: rowKey(item),
    active: selected === item || checkedKeys.includes(rowKey(item)),
    checked: checkedKeys.includes(rowKey(item)),
    onSelect: (event?: MentionPointerModifiers) => {
      if (!allowMulti || !event) {
        commit([item])
        return
      }
      const next = resolveMentionPointerSelect({
        orderedKeys: rows.map(rowKey),
        checkedKeys,
        anchorKey: multiActive ? multi.anchorKey : selected ? rowKey(selected) : undefined,
        clickedKey: rowKey(item),
        modifiers: event,
      })
      if (!next) {
        setMulti(undefined)
        commit([item])
        return
      }
      setMulti({ resetKey, keys: next.checkedKeys, anchorKey: next.anchorKey })
      setSelection({ key: rowKey(item), resetKey })
    },
  })
}
