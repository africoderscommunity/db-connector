export async function deleteTable(connection, tableName) {
  const { type, database } = connection?.config || {}
  console.log()

  try {
    switch (type) {
      // 🟦 MySQL
      case 'mysql': {
        const [rows] = await connection.pool.query(
          `DROP TABLE IF EXISTS \`${tableName}\`;`
        )
        return {
          success: true,
          message: `Table '${tableName}' deleted successfully.`,
        }
      }

      // 🟢 PostgreSQL
      case 'postgres': {
        await connection.client.query(
          `DROP TABLE IF EXISTS "${tableName}" CASCADE;`
        )
        return {
          success: true,
          message: `Table '${tableName}' deleted successfully.`,
        }
      }

      // 🟢 MSSQL
      case 'mssql': {
        const tableExistsQuery = `
          IF OBJECT_ID(N'${tableName}', N'U') IS NOT NULL
            DROP TABLE [${tableName}];
        `
        await connection.connection.query(tableExistsQuery)
        return {
          success: true,
          message: `Table '${tableName}' deleted successfully.`,
        }
      }

      // 🟣 MongoDB
      case 'mongodb': {
        const db = connection.connection.db(connection.db)
        console.log({ database })
        const collections = await db
          .listCollections({ name: tableName })
          .toArray()

        if (collections.length === 0) {
          return {
            success: false,
            message: `Collection '${tableName}' not found.`,
          }
        }

        await db.collection(tableName).drop()
        return {
          success: true,
          message: `Collection '${tableName}' deleted successfully.`,
        }
      }

      // 🔴 Unsupported
      default:
        return { success: false, message: `Unsupported database type: ${type}` }
    }
  } catch (error) {
    console.error('Error deleting table:', error)
    return { success: false, message: error.message }
  }
}
