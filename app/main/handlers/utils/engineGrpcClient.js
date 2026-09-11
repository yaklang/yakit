const grpc = require('@grpc/grpc-js')
const { grpcTarget } = require('./engineEndpoint')

function createEngineGrpcClient(Yak, connection, options = {}) {
  // Each client owns its credentials. An unrelated connection attempt cannot change
  // the metadata of RPCs already in flight on this client.
  const { caPem = '', password = '' } = connection
  const defaultYakGRPCAddr = connection.endpoint ? grpcTarget(connection.endpoint) : connection.defaultYakGRPCAddr
  // Probes and production clients must bypass proxies for local endpoints.
  if (connection.endpoint) options = { ...options, 'grpc.enable_http_proxy': 0 }
  if (caPem) {
    const metadata = new grpc.Metadata()
    metadata.set('authorization', `bearer ${password}`)
    const auth = grpc.credentials.createFromMetadataGenerator((params, callback) => callback(null, metadata))
    return new Yak(
      defaultYakGRPCAddr,
      grpc.credentials.combineChannelCredentials(
        grpc.credentials.createSsl(Buffer.from(caPem, 'latin1'), null, null, {
          checkServerIdentity: () => undefined,
        }),
        auth,
      ),
      options,
    )
  }
  const interceptors = [...(options.interceptors || [])]
  if (password) {
    interceptors.unshift(
      (callOptions, nextCall) =>
        new grpc.InterceptingCall(nextCall(callOptions), {
          start(metadata, listener, next) {
            metadata.set('authorization', `bearer ${password}`)
            next(metadata, listener)
          },
        }),
    )
  }
  return new Yak(defaultYakGRPCAddr, grpc.credentials.createInsecure(), { ...options, interceptors })
}

module.exports = { createEngineGrpcClient }
