import { ipc } from '@/services/ipc'
import { failed } from '../../utils/notification'
import { Uint8ArrayToString } from '@/utils/str'

export enum RequestToYakCodeTemplate {
  Ordinary = 0,
  Batch = 1,
}

export const generateYakCodeByRequest = (
  isHttps: boolean,
  req: Uint8Array,
  onResult: (code: string) => any,
  template?: RequestToYakCodeTemplate,
) => {
  ipc
    .invoke('grpc', 'GenerateYakCodeByPacket', {
      IsHttps: isHttps,
      Request: req,
      CodeTemplate: template === RequestToYakCodeTemplate.Batch ? 'Batch' : 'Ordinary',
    })
    .then((r) => {
      onResult(Buffer.from(r.Code).toString())
    })
    .catch((e) => {
      failed(`Generate Yak Code Failed：${e}`)
    })
}

export const generateCSRFPocByRequest = (
  req: Uint8Array,
  IsHttps: boolean,
  onResult: (code: string) => any,
  AutoSubmit = false,
) => {
  ipc
    .invoke('grpc', 'GenerateCSRFPocByPacket', {
      Request: req,
      IsHttps,
      AutoSubmit,
    })
    .then((r) => {
      onResult(Uint8ArrayToString(r.Code, 'utf8'))
    })
    .catch((e) => {
      failed(`Generate CSRF PoC failed: ${e}`)
    })
}
