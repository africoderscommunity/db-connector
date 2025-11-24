const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  db: {
    testConnection: (config) =>
      ipcRenderer.invoke('db:test-connection', config),
    connect: (config) => ipcRenderer.invoke('db:connect', config),
    createTable: (config) => ipcRenderer.invoke('db:create-table', config),
    getTables: (config) => ipcRenderer.invoke('db:get-tables', config),
    getTableData: (params) => ipcRenderer.invoke('db:get-table-data', params),
    executeQuery: (params) => ipcRenderer.invoke('db:execute-query', params),
    disconnect: (connectionId) =>
      ipcRenderer.invoke('db:disconnect', connectionId),
    getSessionStatus: (params) => ipcRenderer.invoke('db:get:session', params),
    deleteTable: ({ connection, tableName }) =>
      ipcRenderer.invoke('db:delete:table', { connection, tableName }),
    getTableStructure: (params) =>
      ipcRenderer.invoke('db:get:structure', params),
    exportTable: (params) => ipcRenderer.invoke('db:export-table', params),
    getColumns: (params) => ipcRenderer.invoke('db:get-columns', params),
  },
  dbEngine: {
    listBinaries: () => ipcRenderer.invoke('list-binaries'),

    // List all instances
    listInstances: () => ipcRenderer.invoke('list-instances'),

    // Create new instance
    createInstance: (engine, port, version) =>
      ipcRenderer.invoke('create-instance', engine, port, version),

    // Start instance
    startInstance: async (id) => {
      await ipcRenderer.invoke('start-instance', id)
      return ipcRenderer.invoke('list-instances') // Return updated list
    },

    // Stop instance
    stopInstance: async (id) => {
      await ipcRenderer.invoke('stop-instance', id)
      return ipcRenderer.invoke('list-instances') // Return updated list
    },

    // Delete instance
    deleteInstance: async (id) => {
      await ipcRenderer.invoke('delete-instance', id)
      return ipcRenderer.invoke('list-instances') // Return updated list
    },

    // Get connection info
    getConnectionInfo: (id) => ipcRenderer.invoke('get-connection-info', id),

    // Get instance logs
    getInstanceLogs: (id) => ipcRenderer.invoke('get-instance-logs', id),
  },
  // ✅ Event listener for successful DB connection
  onDbConnected: (callback) => {
    ipcRenderer.on('db:connected', (_, payload) => callback(payload))
  },

  // ✅ Optional: remove listener to prevent duplicate events
  removeDbConnectedListener: () => {
    ipcRenderer.removeAllListeners('db:connected')
  },
})
