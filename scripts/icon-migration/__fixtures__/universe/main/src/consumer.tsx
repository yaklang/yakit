import { NamedIcon } from './icons'
import { SharedIcon } from '../../shared/shared-icon'

export const Consumer = () => (
  <button aria-label="fixture">
    <NamedIcon className="named" />
    <SharedIcon />
  </button>
)
