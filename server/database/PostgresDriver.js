import { BaseDriver } from './BaseDriver.js'
import pkg from 'pg'
const { Client: PgClient } = pkg

export class PostgresDriver extends BaseDriver {
  async getColumns(table) {
    const sql = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `
    const res = await this.conn.connection.query(sql, [table])

    return res.rows.map((c) => ({
      name: c.column_name,
      type: c.data_type,
      nullable: c.is_nullable === 'YES',
      default: c.column_default,
    }))
  }
  static async testConnection(config) {
    const client = new PgClient({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    })

    await client.connect()
    await client.end()

    return { success: true }
  }
  async executeQuery(query) {
    const startTime = Date.now()
    const res = await this.conn.connection.query(query)
    const columns = res.rows.length ? Object.keys(res.rows[0]) : []
    const rows = res.rows.map((r) => Object.values(r))
    const rowsAffected = res.rowCount

    return {
      columns,
      rows,
      rowsAffected,
      executionTime: ((Date.now() - startTime) / 1000).toFixed(3) + 's',
    }
  }

  async getTables(db) {
    console.log({ connection: this.conn })
    const result = await this.conn.connection.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    )
    return result.rows.map((r) => r.tablename)
  }

  async getTableData(tableName, limit = 100) {
    const query = `SELECT * FROM "${tableName}" LIMIT ${limit}`
    const result = await this.conn.connection.query(query)

    const columns = result.rows.length ? Object.keys(result.rows[0]) : []
    const rows = result.rows.map((r) => Object.values(r))

    return {
      columns,
      rows,
      totalCount: rows.length,
      allQueries: query,
    }
  }

  async connect(config) {
    const connection = new PgClient({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      encrypt: true,
    })
    await connection.connect()
    const PrimaryUnique = {}
    return {
      connection,
      PrimaryUnique,
    }
  }
}
