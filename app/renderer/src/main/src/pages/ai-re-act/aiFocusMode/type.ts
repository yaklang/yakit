export interface AIFocusModeOption {
  value: string
  label: string
  description?: string
}

export interface AIFocusModeProps {
  value?: string
  onChange: (value?: string) => void
  className?: string
  iconOnly?: boolean
  disabled?: boolean
  options?: AIFocusModeOption[]
  allowClear?: boolean
}
