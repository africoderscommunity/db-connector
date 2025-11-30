import { BaseDriver } from './BaseDriver.js'
import sql from 'mssql'

const MssqlPrimaryAndUniqueIndexes = `
SELECT 
    t.name AS TableName,
    i.name AS IndexName,
    c.name AS ColumnName,
    CASE 
        WHEN i.is_primary_key = 1 THEN 'PRIMARY'
        WHEN i.is_unique = 1 THEN 'UNIQUE'
        ELSE 'INDEX'
    END AS KeyType,
    fk.name AS ForeignKeyName,
    ref_t.name AS ReferencedTable,
    ref_c.name AS ReferencedColumn
FROM sys.tables AS t
INNER JOIN sys.indexes AS i
    ON t.object_id = i.object_id
INNER JOIN sys.index_columns AS ic
    ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns AS c
    ON ic.object_id = c.object_id AND ic.column_id = c.column_id
LEFT JOIN sys.foreign_key_columns AS fkc
    ON fkc.parent_object_id = t.object_id AND fkc.parent_column_id = c.column_id
LEFT JOIN sys.foreign_keys AS fk
    ON fk.object_id = fkc.constraint_object_id
LEFT JOIN sys.tables AS ref_t
    ON ref_t.object_id = fkc.referenced_object_id
LEFT JOIN sys.columns AS ref_c
    ON ref_c.object_id = fkc.referenced_object_id AND ref_c.column_id = fkc.referenced_column_id
WHERE i.type_desc <> 'HEAP'
ORDER BY t.name, i.name, ic.key_ordinal;
`

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

  async dbDisconnect(conn){
     await conn.connection.close()
  }
  async  deleteTable(connection, tableName) {
  

 try {
   const tableExistsQuery = `
          IF OBJECT_ID(N'${tableName}', N'U') IS NOT NULL
            DROP TABLE [${tableName}];
        `
        await connection.connection.query(tableExistsQuery)
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
          c.name AS column_name,
          t.name AS data_type,
          c.is_nullable,
          c.is_identity,
          c.max_length,
          c.precision,
          c.scale,
          OBJECT_DEFINITION(c.default_object_id) AS column_default,
          fk.name AS foreign_key_name,
          fk_ref.name AS foreign_table,
          fk_col.name AS foreign_column
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        JOIN sys.objects o ON o.object_id = c.object_id
        JOIN sys.schemas s ON s.schema_id = o.schema_id
        LEFT JOIN sys.foreign_key_columns fkc 
          ON fkc.parent_object_id = c.object_id 
          AND fkc.parent_column_id = c.column_id
        LEFT JOIN sys.foreign_keys fk 
          ON fk.object_id = fkc.constraint_object_id
        LEFT JOIN sys.objects fk_ref 
          ON fk_ref.object_id = fkc.referenced_object_id
        LEFT JOIN sys.columns fk_col 
          ON fk_col.column_id = fkc.referenced_column_id 
          AND fk_col.object_id = fk_ref.object_id
        WHERE o.name = @tableName 
          AND s.name = 'dbo'
        ORDER BY c.column_id;
      `
    
          const tableMetaQuery = `
        SELECT 
          'MSSQL' AS Engine,
          d.collation_name AS Collation,
          SUM(p.rows) AS [Rows]
        FROM sys.tables t
        INNER JOIN sys.partitions p 
          ON t.object_id = p.object_id 
          AND p.index_id IN (0, 1)
        CROSS JOIN sys.databases d
        WHERE t.name = @tableName
          AND d.name = DB_NAME()
        GROUP BY d.collation_name;
      `
    
          const request = conn.connection.request()
          request.input('tableName', sql.NVarChar, tableName)
    
          // Run both structure + meta queries
          const [structureResult, metaResult] = await Promise.all([
            request.query(tableStructureQuery),
            conn.connection
              .request()
              .input('tableName', sql.NVarChar, tableName)
              .query(tableMetaQuery),
          ])
    
          const meta = metaResult.recordset[0] || {
            Engine: 'Unknown',
            Collation: 'Unknown',
            Rows: 0,
          }
    
          const columns = structureResult.recordset.map((col) => {
            let dataType = col.data_type
            if (['nvarchar', 'varchar', 'char', 'nchar'].includes(col.data_type)) {
              dataType += `(${col.max_length === -1 ? 'MAX' : col.max_length})`
            } else if (['decimal', 'numeric'].includes(col.data_type)) {
              dataType += `(${col.precision},${col.scale})`
            } else if (['datetime2'].includes(col.data_type)) {
              dataType += `(${col.scale})`
            } else if (
              ['int', 'float', 'bigint', 'smallint'].includes(col.data_type)
            ) {
              dataType += `(${col.max_length})`
            }
    
            const foreignKey =
              col.foreign_table && col.foreign_column
                ? `dbo.${col.foreign_table}(${col.foreign_column})`
                : null
            return {
              name: col.column_name,
              type: dataType,
              nullable: col.is_nullable ? 'YES' : 'NO',
              key: col.is_identity ? 'PRI' : '',
              default: col.column_default || null,
              extra: col.is_identity ? 'IDENTITY' : '',
              foreign_key: foreignKey,
            }
          })
    
          return {
            columns,
            meta,
          }
  }
      
}
