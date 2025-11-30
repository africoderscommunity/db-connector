import { BaseDriver } from './BaseDriver.js'
import mysql from 'mysql2/promise'

export class MySQLDriver extends BaseDriver {
  async getColumns(table) {
    const [rows] = await this.conn.connection.query(
      `SHOW COLUMNS FROM \`${table}\`;`
    )

    return rows.map((c) => ({
      name: c.Field,
      type: c.Type,
      nullable: c.Null === 'YES',
      key: c.Key,
      default: c.Default,
      extra: c.Extra,
    }))
  }

  static async testConnection(config) {
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    })

    await conn.end()
    return { success: true }
  }
  async executeQuery(query) {
    const startTime = Date.now()
    const [result] = await this.conn.connection.query(query)
    let columns = [],
      rows = [],
      rowsAffected = 0

    if (Array.isArray(result) && result.length > 0) {
      columns = Object.keys(result[0])
      rows = result.map((r) => Object.values(r))
      rowsAffected = result.length
    } else {
      rowsAffected = result.affectedRows || 0
    }

    return {
      columns,
      rows,
      rowsAffected,
      executionTime: ((Date.now() - startTime) / 1000).toFixed(3) + 's',
    }
  }

  async getTables(db, refresh = false) {
    const [rows] = await this.conn.connection.query('SHOW TABLES')
    return rows.map((row) => Object.values(row)[0])
  }
  async getTableData(tableName, limit = 100) {
    const [rows] = await this.conn.connection.query(
      `SELECT * FROM \`${tableName}\` LIMIT ${limit}`
    )

    const columns = rows.length ? Object.keys(rows[0]) : []
    const formattedRows = rows.map((r) => Object.values(r))

    return {
      columns,
      rows: formattedRows,
      totalCount: rows.length,
      allQueries: `SELECT * FROM \`${tableName}\` LIMIT ${limit}`,
    }
  }
  async connect(config) {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      encrypt: true,
    })
    const PrimaryUnique = {}
    return {
      connection,
      PrimaryUnique,
    }
  }

  async dbDisconnect(conn){
     await conn.connection.end()
  }

  async  deleteTable(connection, tableName) {
  

 try {
  
        const [rows] = await connection.pool.query(
          `DROP TABLE IF EXISTS \`${tableName}\`;`
        )
        return {
          success: true,
          message: `Table '${tableName}' deleted successfully.`,
        }
 } catch (error) {
  console.error('Error deleting table:', error)
    return { success: false, message: error.message }
 
 }
      }
     async  getTableStructure(conn, tableName) {
const [rows] = await conn.connection.query(
        `SHOW FULL COLUMNS FROM \`${tableName}\``
      )
     const  columns = rows.map((col) => ({
        name: col.Field,
        type: col.Type,
        nullable: col.Null === 'YES',
        key: col.Key,
        default: col.Default,
        extra: col.Extra,
      }))
      return {
        columns
      }
  }
}
