// GRPC Client Proxy Module
const {ipcMain} = require("electron")

// Map to store active streams for reference
const activeStreams = new Map()

/**
 * Creates a proxy for the GRPC client to track request/response
 * @param {Object} client - The original GRPC client
 * @param {Function} grpcReqHandle - Function to handle requests before they're sent
 * @param {Function} grpcRspHandle - Function to handle responses after they're received
 * @returns {Object} - A proxy wrapper around the original client
 */
function createGRPCClientProxy(client, grpcReqHandle, grpcRspHandle) {
    if (!client) {
        return null
    }

    // Create a proxy object to intercept all method calls
    const proxy = new Proxy(client, {
        get(target, prop) {
            // Get the original property/method
            const originalProp = target[prop]

            // If it's not a function or is a special function (like close), just return it
            if (typeof originalProp !== "function" || prop === "close") {
                return originalProp
            }

            // Return a wrapped function for GRPC methods
            return function(...args) {
                const methodName = prop
                const params = args[0] || {}
                
                // Generate a unique ID for this call
                const callId = `${methodName}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
                
                // Call the request handler
                grpcReqHandle(methodName, params, callId)
                
                // Check if the last argument is a callback (non-stream method)
                const lastArg = args[args.length - 1]
                const hasCallback = typeof lastArg === "function"
                
                if (hasCallback) {
                    // For regular callback-based methods
                    const originalCallback = args[args.length - 1]
                    
                    // Replace the callback with our proxy callback
                    args[args.length - 1] = (err, response) => {
                        // Call the response handler
                        grpcRspHandle(methodName, params, err, response, false, callId)
                        
                        // Call the original callback
                        originalCallback(err, response)
                    }
                    
                    // Call the original method with modified args
                    return originalProp.apply(target, args)
                } else {
                    // For streaming methods
                    const stream = originalProp.apply(target, args)
                    
                    // Create a proxy stream
                    const originalOn = stream.on
                    const originalWrite = stream.write
                    
                    // Store stream reference
                    activeStreams.set(callId, {
                        stream,
                        methodName,
                        params
                    })
                    
                    // Override the 'on' method to capture data events
                    stream.on = function(event, listener) {
                        if (event === 'data') {
                            // Wrap the data listener
                            return originalOn.call(this, event, (data) => {
                                // Handle stream response data
                                grpcRspHandle(methodName, params, null, data, true, callId)
                                
                                // Call the original listener
                                listener(data)
                            })
                        } else if (event === 'end') {
                            // Wrap the end listener to clean up
                            return originalOn.call(this, event, () => {
                                // Remove stream from active streams
                                activeStreams.delete(callId)
                                
                                // Call the original listener
                                listener()
                            })
                        } else if (event === 'error') {
                            // Wrap error listener
                            return originalOn.call(this, event, (err) => {
                                // Handle error
                                grpcRspHandle(methodName, params, err, null, true, callId)
                                
                                // Remove stream from active streams on error
                                activeStreams.delete(callId)
                                
                                // Call the original listener
                                listener(err)
                            })
                        } else {
                            // For other events, just pass through
                            return originalOn.call(this, event, listener)
                        }
                    }
                    
                    // If the stream has a write method (bidirectional stream)
                    if (typeof stream.write === 'function') {
                        stream.write = function(data) {
                            // Log the write operation
                            console.log(`GRPC Stream Write - Method: ${methodName}, CallId: ${callId}`)
                            
                            // Call the original write method
                            return originalWrite.call(this, data)
                        }
                    }
                    
                    return stream
                }
            }
        }
    })
    
    return proxy
}

// Register handlers for stream operations
function setupStreamHandlers(win) {
    // Handler for sending data to an active stream
    ipcMain.handle("grpc-stream-send", async (e, callId, data) => {
        const streamInfo = activeStreams.get(callId)
        
        if (!streamInfo || !streamInfo.stream) {
            return {success: false, error: "Stream not found or already closed"}
        }
        
        try {
            // Create a log entry for this stream write
            const logEntry = {
                type: "stream-write",
                isStream: true,
                methodName: streamInfo.methodName,
                params: streamInfo.params,
                data: data,
                timestamp: Date.now(),
                callId
            }
            
            // Send log
            win && win.webContents.send("grpc-invoke-log", logEntry)
            
            // Try to write to the stream
            streamInfo.stream.write(data)
            return {success: true}
        } catch (err) {
            // Log error
            const errorLogEntry = {
                type: "error",
                isStream: true,
                methodName: streamInfo.methodName,
                params: streamInfo.params,
                error: err.message || "Failed to write to stream",
                timestamp: Date.now(),
                callId
            }
            
            win && win.webContents.send("grpc-invoke-log", errorLogEntry)
            
            return {success: false, error: err.message || "Failed to write to stream"}
        }
    })
    
    // Handler for canceling an active stream
    ipcMain.handle("grpc-stream-cancel", async (e, callId) => {
        const streamInfo = activeStreams.get(callId)
        
        if (!streamInfo || !streamInfo.stream) {
            return {success: false, error: "Stream not found or already closed"}
        }
        
        try {
            // Create a log entry for this stream cancellation
            const logEntry = {
                type: "stream-cancel",
                isStream: true,
                methodName: streamInfo.methodName,
                params: streamInfo.params,
                timestamp: Date.now(),
                callId
            }
            
            // Send log
            win && win.webContents.send("grpc-invoke-log", logEntry)
            
            // Try to cancel the stream
            streamInfo.stream.cancel()
            activeStreams.delete(callId)
            return {success: true}
        } catch (err) {
            // Log error
            const errorLogEntry = {
                type: "error",
                isStream: true,
                methodName: streamInfo.methodName,
                params: streamInfo.params,
                error: err.message || "Failed to cancel stream",
                timestamp: Date.now(),
                callId
            }
            
            win && win.webContents.send("grpc-invoke-log", errorLogEntry)
            
            return {success: false, error: err.message || "Failed to cancel stream"}
        }
    })
    
    // Handler to get all active streams
    ipcMain.handle("grpc-get-active-streams", async (e) => {
        const streams = []
        
        activeStreams.forEach((value, key) => {
            streams.push({
                callId: key,
                methodName: value.methodName,
                params: value.params
            })
        })
        
        return streams
    })
}

module.exports = {
    createGRPCClientProxy,
    setupStreamHandlers
} 