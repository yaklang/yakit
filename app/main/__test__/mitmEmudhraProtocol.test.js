const path = require('path')
const protoLoader = require('@grpc/proto-loader')

describe('MITM eMudhra protobuf contract', () => {
  const definition = protoLoader.loadSync(path.resolve(__dirname, '../../protos/grpc.proto'), {
    keepCase: true,
    defaults: true,
  })

  for (const type of ['ypb.MITMV2Request']) {
    const message = definition['ypb.Yak'].MITMV2

    it(`${type} keeps eMudhra disabled when the field is absent`, () => {
      expect(message.requestDeserialize(message.requestSerialize({})).UseEMudhra).toBe(false)
    })

    it(`${type} sends the opt-in flag with the engine's field number`, () => {
      const encoded = message.requestSerialize({ UseEMudhra: true })
      // MITMV2Request: field 59 (varint).
      expect([...encoded]).toEqual([0xd8, 0x03, 0x01])
      expect(message.requestDeserialize(encoded).UseEMudhra).toBe(true)
    })
  }
})
