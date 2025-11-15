export class BaseDriver {
  constructor(conn, activeConnections = {}) {
    this.conn = conn
    this.activeConnections = activeConnections
  }

  // Must be overridden
  async getColumns(table, options) {
    throw new Error('getColumns() must be implemented by subclass')
  }

  // Optional override
  static async testConnection(config) {
    throw new Error('testConnection() must be implemented by subclass')
  }
  async executeQuery(query, queryObject) {
    throw new Error('executeQuery() must be implemented by subclass')
  }
  async getTables(db, refresh = false) {
    throw new Error('getTables() not implemented for this driver')
  }
  async getTableData(tableName, limit = 100, offset = 0) {
    throw new Error('getTableData() not implemented')
  }
  async connect(config) {
    throw new Error('getTableData() not implemented')
  }
}
