import { mitmEvents } from '@/pages/mitm/emiter'
import mitt from "mitt"

type T = mitmEvents

const emiter = mitt<T>()

export default emiter
