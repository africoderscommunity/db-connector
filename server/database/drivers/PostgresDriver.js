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

  async dbDisconnect(conn){
     await conn.connection.end()
  }
   async  deleteTable(connection, tableName) {
 try {
  
   await connection.client.query(
          `DROP TABLE IF EXISTS "${tableName}" CASCADE;`
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
 const tableStructureQuery = `
    SELECT
      a.attname AS column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
      a.attnotnull AS not_null,
      coalesce(pg_get_expr(ad.adbin, ad.adrelid), '') AS column_default,
      CASE WHEN seq.relname IS NOT NULL THEN 'YES' ELSE 'NO' END AS is_identity,
      fk.relname AS foreign_table,
      fa.attname AS foreign_column,
      con.conname AS foreign_key_name
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
    LEFT JOIN pg_depend d ON d.refobjid = a.attrelid AND d.refobjsubid = a.attnum
    LEFT JOIN pg_class seq ON seq.oid = d.objid AND seq.relkind = 'S'
    LEFT JOIN pg_constraint con ON con.conrelid = c.oid AND con.contype = 'f'
    LEFT JOIN pg_class fk ON fk.oid = con.confrelid
    LEFT JOIN pg_attribute fa ON fa.attrelid = fk.oid AND fa.attnum = ANY(con.confkey)
    WHERE c.relname = $1 AND a.attnum > 0
    ORDER BY a.attnum;
  `

      // 2️⃣ Table metadata (row count & collation)
      const tableMetaQuery = `
    SELECT
      'PostgreSQL' AS Engine,
      pg_catalog.pg_encoding_to_char(pg_database.encoding) AS Encoding,
      COALESCE(reltuples::bigint, 0) AS Rows
    FROM pg_class
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
    JOIN pg_database ON pg_database.datname = current_database()
    WHERE pg_class.relname = $1;
  `

      const [structureResult, metaResult] = await Promise.all([
        conn.connection.query(tableStructureQuery, [tableName]),
        conn.connection.query(tableMetaQuery, [tableName]),
      ])

      const meta = metaResult.rows[0] || {
        Engine: 'PostgreSQL',
        Encoding: 'Unknown',
        Rows: 0,
      }

     const  columns = structureResult.rows.map((col) => {
        let dataType = col.data_type
        return {
          name: col.column_name,
          type: dataType,
          nullable: !col.not_null,
          key: col.is_identity === 'YES' ? 'PRI' : '',
          default: col.column_default || null,
          extra: col.is_identity === 'YES' ? 'IDENTITY' : '',
          foreign_key:
            col.foreign_table && col.foreign_column
              ? `${col.foreign_table}(${col.foreign_column})`
              : null,
        }
      })

      return { columns, meta }
  }
}
