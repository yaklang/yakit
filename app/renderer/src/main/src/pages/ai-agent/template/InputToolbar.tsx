import React from 'react'

/** Keep toolbar and portal clicks from moving focus back into the message editor. */
export const InputToolbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ onClick, ...props }) => (
  <div
    {...props}
    onClick={(event) => {
      event.stopPropagation()
      onClick?.(event)
    }}
  />
)
