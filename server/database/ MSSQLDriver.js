import { BaseDriver } from './BaseDriver.js'
import { MssqlPrimaryAndUniqueIndexes } from './queries/sql.js'

import sql from 'mssql'
export class MSSQLDriver extends BaseDriver {
  async getColumns(table) {
    const query = `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @table
      ORDER BY ORDINAL_POSITION
    `

    const req = this.conn.connection.request()
    req.input('table', sql.NVarChar, table)
    const result = await req.query(query)
    //  const mssqlConn = this.activeConnections.get(this.conn.config.id);
    //     activeConnections.set(conn.config.id, {
    //       ...mssqlConn,
    //       autoCompletion: {
    //         ...mssqlConn.autoCompletion,
    //         [table]: columns.map((c) => c.name)
    //       }
    //     });

    return result.recordset.map((c) => ({
      name: c.COLUMN_NAME,
      type: c.DATA_TYPE,
      nullable: c.IS_NULLABLE === 'YES',
      default: c.COLUMN_DEFAULT,
    }))
  }
  static async testConnection(config) {
    const pool = await sql.connect({
      server: config.host,
      port: parseInt(config.port),
      user: config.username,
      password: config.password,
      database: config.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    })

    await pool.close()
    return { success: true }
  }
  async executeQuery(query) {
    const startTime = Date.now()
    const res = await this.conn.connection.query(query)
    let columns = [],
      rows = [],
      rowsAffected = 0

    if (res.recordset && res.recordset.length > 0) {
      columns = Object.keys(res.recordset[0])
      rows = res.recordset.map((r) => Object.values(r))
      rowsAffected = res.recordset.length
    } else if (res.rowsAffected && res.rowsAffected.length > 0) {
      rowsAffected = res.rowsAffected[0]
    }

    return {
      columns,
      rows,
      rowsAffected,
      executionTime: ((Date.now() - startTime) / 1000).toFixed(3) + 's',
    }
  }
  async getTables(db, refresh = false) {
    const query = `
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE'
  `

    const result = await this.conn.connection.query(query)
    const tables = result.recordset.map((r) => r.TABLE_NAME)
    this.activeConnections?.set(this.conn.config.id, {
      ...this.conn,
      tables,
      allTables: { ...(this.conn?.allTables || {}), [db]: tables },
    })
    return tables
  }

  async getTableData(tableName, limit = 100, offset = 0) {
    const schema = 'dbo'
    let allQueries = ''

    // 1️⃣ Get first column
    const columnsQuery = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA = '${schema}'
    ORDER BY ORDINAL_POSITION;
  `
    allQueries += columnsQuery + '<->'

    // Todo

    const columnsResult = await this.conn.connection.query(columnsQuery)
    const firstColumn = columnsResult.recordset[0]?.COLUMN_NAME || null

    // 2️⃣ ORDER BY safe fallback
    const orderClause = firstColumn
      ? `ORDER BY [${firstColumn}]`
      : `ORDER BY (SELECT NULL)`

    allQueries += orderClause + '<->'

    // 3️⃣ Main paginated query
    const query = `
    SELECT * FROM [${schema}].[${tableName}]
    ${orderClause}
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
  `
    allQueries += query + '<->'

    // 4️⃣ Count
    const countQuery = `
    SELECT COUNT(*) AS count FROM [${schema}].[${tableName}];
  `
    allQueries += countQuery + '<->'

    // 5️⃣ Parallel execution
    const [mainRes, countRes] = await Promise.all([
      this.conn.connection.query(query),
      this.conn.connection.query(countQuery),
    ])

    const rows = mainRes.recordset
    const columns = rows.length ? Object.keys(rows[0]) : []
    const formattedRows = rows.map((r) => Object.values(r))

    return {
      columns,
      rows: formattedRows,
      totalCount: countRes.recordset[0]?.count || 0,
      allQueries,
    }
  }
  async connect(config) {
    const connection = await sql.connect({
      server: config.host,
      port: parseInt(config.port),
      user: config.username,
      password: config.password,
      database: config.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    })
    const PrimaryUnique = (await connection.query(MssqlPrimaryAndUniqueIndexes))
      .recordset

    return {
      connection,
      PrimaryUnique,
    }
  }
}
