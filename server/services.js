
import { getClass } from './database/drivers/index.js'
import { DbEngine } from './database/dbngin/dbEngineController.js'

 
const activeConnections = new Map()
const primaryUnique = new Map()


export const eventHandlers = (mainWindow) => [
  // ==========================================
  // Test Connection
  // ==========================================
  {
    event: "db:test-connection",
    handler: async (event, config) => {
      try {
         const Driver = getClass(config.type)
         const driver = new Driver({ ...config, config: { type: config.type }})
         const result = await driver.testConnection(config)
         return { success: true, ...result }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },
  },

  // ==========================================
  // Connect
  // ==========================================
  {
    event: "db:connect",
    handler: async (event, config) => {
      try {
         const Driver = getClass(config.type)
         const driver = new Driver({ ...config, config: { type: config.type }})
         const { PrimaryUnique, databases, connection } = await driver.connect(config)
        
        activeConnections.set(config.id, { connection, config, databases })
        activeConnections.set("currentActiveDatabase", config.id)
        primaryUnique.set(config.id, PrimaryUnique)

        mainWindow.webContents.send("db:connected", {
          id: config.id,
          type: config.type,
          databases,
          message: `${config.type.toUpperCase()} connected successfully!`,
        })

        return { success: true, databases }
      } catch (error) {
        console.log(error)
        return { success: false, error: error.message }
      }
    },
  },

  // ==========================================
  // Get Tables
  // ==========================================
  {
    event: "db:get-tables",
    handler: async (event, { connectionId, db, refresh }) => {
      try {
        const conn = activeConnections.get(connectionId)
        console.log(conn)
        if (!conn) throw new Error("Please connect your database")
          const Driver = getClass(conn.config.type)
         const driver = new Driver(conn, activeConnections)
        const tables = await driver.getTables(db, refresh)

        activeConnections.set("currentActiveDatabase", connectionId)

        return { success: true, tables, allQueries: "" }
      } catch (error) {
        console.log(error)
        return { success: false, message: error.message }
      }
    },
  },

  // ==========================================
  // Get Table Data
  // ==========================================
  {
    event: "db:get-table-data",
    handler: async (event, { connectionId, tableName, limit = 100, offset = 0 }) => {
      try {
        const conn = activeConnections.get(connectionId)
        if (!conn) throw new Error("Please connect your database")
       const Driver = getClass(conn.config.type)
         const driver = new Driver(conn)
        const result = await driver.getTableData(tableName, limit, offset)

        activeConnections.set("currentActiveDatabase", connectionId)

        return { success: true, data: result }
      } catch (error) {
        console.log(error)
        return { success: false, error: error.message }
      }
    },
  },

  // ==========================================
  // Session
  // ==========================================
  {
    event: "db:get:session",
    handler: async (event, databaseName = "") => {
      return Object.fromEntries(
        Array.from(activeConnections.entries()).map(([connectionId, connData]) => {
          if (connectionId === "currentActiveDatabase") {
            return [connectionId, connData]
          }
          const primaryUniqueKey = primaryUnique.get(connectionId)
          return [
            connectionId,
            {
              status: true,
              connectionId,
              config: {
                name: connData?.config?.name,
                type: connData?.config?.type,
                id: connData?.config?.id,
                database: connData?.config?.database,
              },
              allTables: connData?.allTables,
              tables: connData?.tables,
              databases: connData?.databases,
              primaryUniqueKey,
              autoCompletion: connData.autoCompletion,
            },
          ]
        })
      )
    },
  },

  // ==========================================
  // Delete Table
  // ==========================================
  {
    event: "db:delete:table",
    handler: async (event, { connection, tableName }) => {
        const conn = activeConnections.get(connectionId)
        if (!conn) throw new Error("Please connect your database")
        const Driver = getClass(conn.config.type)
        
        const driver = new Driver(conn)
      
      

      return driver.deleteTable(conn, tableName)
    },
  },

  // ==========================================
  // Get Table Structure
  // ==========================================
  {
    event: "db:get:structure",
    handler: async (event, { connection, tableName }) => {
      const conn = activeConnections.get(connection.id)
      if (!conn) throw new Error("Please connect your database")
         const Driver = getClass(conn.config.type)
         const driver = new Driver(conn,activeConnections)
        return  driver.getTableStructure(conn, tableName)
       

    },
  },

  // ==========================================
  // Execute Query
  // ==========================================
  {
    event: "db:execute-query",
    handler: async (event, { connectionId, query, queryObject }) => {
      try {
        const conn = activeConnections.get(connectionId)
        if (!conn) throw new Error("Please connect your database")

         const Driver = getClass(conn.config.type)
         const driver = new Driver(conn,activeConnections)
        const result = await driver.executeQuery(query, queryObject)
        activeConnections.set("currentActiveDatabase", connectionId)
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },
  },

  // ==========================================
  // Disconnect
  // ==========================================
  {
    event: "db:disconnect",
    handler: async (event, connectionId) => {
      try {
        
       const conn = activeConnections.get(connectionId)
        if (!conn) throw new Error("Please connect your database")

        const Driver = getClass(conn.config.type)
         const driver = new Driver(conn,activeConnections)
       await driver.dbDisconnect(conn)
         return { success: true }

      } catch (error) {
    return { success: false, error: error.message }
        
      }
    }
  },

  // ==========================================
  // Create Table
  // ==========================================
  {
    event: "db:create-table",
    handler: async (event, config) => {
      const conn = activeConnections.get(config.connection.id)
      if (!conn) throw new Error("Please connect your database")
         const Driver = getClass(conn.config.type)
         const driver = new Driver(conn, activeConnections)
         await driver.createTable(config.tableName)

      return { success: true }
    },
  },

  // ==========================================
  // Export Table
  // ==========================================
  {
    event: "db:export-table",
    handler: async (event, { connection, tableName, format }) => {
      try {
        if (!connection || !tableName || !format) {
          throw new Error("Missing parameters")
        }

            const Driver = getClass(conn.config.type)
         const driver = new Driver(conn)
        const tableData = await driver.getTableData(tableName, limit, offset)

        if (!tableData || !Array.isArray(tableData.rows)) {
          throw new Error("No data found or invalid table response")
        }

        const rows = tableData.rows
        let fileContent, defaultExt, filters

        switch (format) {
          case "json":
            fileContent = JSON.stringify(rows, null, 2)
            defaultExt = "json"
            filters = [{ name: "JSON File", extensions: ["json"] }]
            break

          case "csv":
            fileContent = parse(rows)
            defaultExt = "csv"
            filters = [{ name: "CSV File", extensions: ["csv"] }]
            break

          case "sql":
            defaultExt = "sql"
            filters = [{ name: "SQL File", extensions: ["sql"] }]
            const columns = Object.keys(rows[0] || {})
            const insertStatements = rows.map((row) => {
              const values = columns
                .map((col) => {
                  const val = row[col]
                  if (val === null || val === undefined) return "NULL"
                  if (typeof val === "number") return val
                  return `'${String(val).replace(/'/g, "''")}'`
                })
                .join(", ")
              return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values});`
            })
            fileContent = insertStatements.join("\n")
            break

          default:
            throw new Error(`Unsupported format: ${format}`)
        }

        const { filePath } = await dialog.showSaveDialog({
          title: `Export ${tableName} as ${format.toUpperCase()}`,
          defaultPath: path.join(os.homedir(), `${tableName}.${defaultExt}`),
          filters,
        })

        if (!filePath) {
          return { success: false, message: "Export cancelled by user" }
        }

        await fs.writeFile(filePath, fileContent, "utf8")

        return {
          success: true,
          message: `Table "${tableName}" exported successfully as ${format.toUpperCase()}`,
          filePath,
        }
      } catch (err) {
        console.error("Export failed:", err)
        return { success: false, message: err.message }
      }
    },
  },

  // ==========================================
  // Get Columns
  // ==========================================
  {
    event: "db:get-columns",
    handler: async (event, payload) => {
      const { connectionId, table, limit = 100, offset = 0 } = payload
      try {
        const conn = activeConnections.get(connectionId)
        if (!conn) throw new Error("Please connect your database")

          
         const Driver = getClass(conn.config.type)
         const driver = new Driver(conn, activeConnections)
         const columns = await driver.getColumns(table, { limit, offset })

        return { success: true, columns }
      } catch (err) {
        console.error("❌ getColumns error:", err)
        return { success: false, error: err.message }
      }
    },
  },

  // ==========================================
  // Instance Manager
  // ==========================================
  { event: "list-binaries", handler: async () => DbEngine.listBinaries() },
  { event: "list-instances", handler: async () => DbEngine.listInstances() },
  {
    event: "create-instance",
    handler: async (event, engine, port, version) =>
      DbEngine.createInstance(engine, port, version),
  },
  {
    event: "start-instance",
    handler: async (event, id) => DbEngine.startInstance(id),
  },
  {
    event: "stop-instance",
    handler: async (event, id) => DbEngine.stopInstance(id),
  },
  {
    event: "delete-instance",
    handler: async (event, id) => DbEngine.deleteInstance(id),
  },
  {
    event: "get-connection-info",
    handler: async (event, id) => DbEngine.getConnectionInfo(id),
  },
  {
    event: "get-instance-logs",
    handler: async (event, id) => DbEngine.getInstanceLogs(id),
  },
]
