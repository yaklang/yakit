const grpc = require('@grpc/grpc-js')
const loader = require('@grpc/proto-loader')
const path = require('node:path')

// Use the shipped protobuf and the same gRPC implementation as the desktop app.
const definition = loader.loadSync(path.join(__dirname, '../../app/protos/grpc.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})
const { Yak } = grpc.loadPackageDefinition(definition).ypb
module.exports = { grpc, Yak }
