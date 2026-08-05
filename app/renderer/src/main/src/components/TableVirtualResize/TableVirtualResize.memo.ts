export const shouldRenderVirtualTableCellForHover = (
  previousHoverId: string | number | undefined,
  nextHoverId: string | number | undefined,
  previousRowId: unknown,
  nextRowId: unknown,
) => {
  if (previousHoverId === nextHoverId) return false
  const wasHovered = previousHoverId !== undefined && previousHoverId === previousRowId
  const isHovered = nextHoverId !== undefined && nextHoverId === nextRowId
  return wasHovered || isHovered
}
