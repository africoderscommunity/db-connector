import mysql from 'mysql2/promise'
import { Client as PgClient } from 'pg'
import mssql from 'mssql'
// import sqlite3 from 'sqlite3';
// import { open } from 'sqlite';

export const getTableData = async ({ connection, tableName, limit = 1000 }) => {
  const { type } = connection // mysql | postgres | mssql | sqlite
  let rows = []
  let conn

  try {
    switch (type) {
      // 🟢 MySQL / MariaDB
      case 'mysql': {
        conn = await mysql.createConnection(connection.config)
        const [result] = await conn.query(
          `SELECT * FROM \`${tableName}\` LIMIT ${limit}`
        )
        rows = result
        await conn.end()
        break
      }

      // 🟣 PostgreSQL
      case 'postgres': {
        conn = new PgClient(connection.config)
        await conn.connect()
        const res = await conn.query(
          `SELECT * FROM "${tableName}" LIMIT ${limit}`
        )
        rows = res.rows
        await conn.end()
        break
      }

      // 🔵 MSSQL
      case 'mssql': {
        conn = await mssql.connect(connection.config)
        const result = await conn
          .request()
          .query(`SELECT TOP (${limit}) * FROM [${tableName}]`)
        rows = result.recordset
        await conn.close()
        break
      }

      // // 🟡 SQLite
      // case 'sqlite': {
      //   conn = await open({
      //     filename: connection.config.filename,
      //     driver: sqlite3.Database,
      //   });
      //   rows = await conn.all(`SELECT * FROM ${tableName} LIMIT ${limit}`);
      //   await conn.close();
      //   break;
      // }

      default:
        throw new Error(`Unsupported database type: ${type}`)
    }

    return {
      success: true,
      table: tableName,
      rows,
      totalRows: rows.length,
    }
  } catch (error) {
    console.error(`❌ Error fetching table data for ${tableName}:`, error)
    return {
      success: false,
      message: error.message,
      rows: [],
    }
  }
}
