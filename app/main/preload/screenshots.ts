import { contextBridge } from 'electron'
import { transport } from './transport'

contextBridge.exposeInMainWorld('yakitTransport', transport)
