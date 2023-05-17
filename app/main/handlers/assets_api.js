const {ipcMain} = require("electron")

/*
* service AssetsApi {
  // 资产管理
  rpc QueryPorts(QueryPortsRequest) returns (QueryPortsResponse);
  rpc DeletePorts(DeletePortsRequest) returns (Empty);
  rpc QueryHosts(QueryHostsRequest) returns (QueryHostsResponse);
  rpc DeleteHosts(DeleteHostsRequest) returns (Empty);
  rpc QueryDomains(QueryDomainsRequest) returns(QueryDomainsResponse);
  rpc DeleteDomains(DeleteDomainsRequest)returns(Empty);
}
* */

module.exports = (win, getClient) => {
    // asyncQueryPorts wrapper
    const asyncQueryPorts = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryPorts(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryPorts", async (e, params) => {
        return await asyncQueryPorts(params)
    })

    // asyncDeletePorts wrapper
    const asyncDeletePorts = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeletePorts(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeletePorts", async (e, params) => {
        return await asyncDeletePorts(params)
    })


    // asyncQueryDomains wrapper
    const asyncQueryDomains = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryDomains(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryDomains", async (e, params) => {
        return await asyncQueryDomains(params)
    })

    // asyncQueryDomains wrapper
    const asyncDeleteDomains = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteDomains(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteDomains", async (e, params) => {
        return await asyncDeleteDomains(params)
    })

}
