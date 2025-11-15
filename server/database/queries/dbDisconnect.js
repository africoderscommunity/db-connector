export const dbDisconnect = async (activeConnections, connectionId) => {
  const conn = activeConnections.get(connectionId)
  if (!conn) throw new Error('Please connect your database')
  try {
    if (conn) {
      switch (conn.config.type) {
        case 'mysql':
          await conn.connection.end()
          break
        case 'postgresql':
          await conn.connection.end()
          break
        case 'mongodb':
          await conn.connection.close()
          break
        case 'mssql':
          await conn.connection.close()
          break
      }
      activeConnections.delete(connectionId)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
