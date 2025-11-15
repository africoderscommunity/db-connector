import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import mysql from 'mysql2/promise'
import os from 'os'
import { parse } from 'json2csv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import {
  deleteTable,
  getTableStructure,
  getTableData,
} from './database/queries/index.js'
import { EJSON } from 'bson'
import { DbEngine } from './dbEngineController.js'
import { createDriver } from '../server/db/index.js'
import { testConnection } from './db/index.js'

// Recreate __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import dotenv from 'dotenv'
dotenv.config()

let mainWindow
const isDev = process.env.NODE_ENV === 'development'
// Store active connections
const activeConnections = new Map()
const primaryUnique = new Map()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // icon: path.join(__dirname, '../build/icon.png')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    // mainWindow.loadFile(path.join(__dirname, './dist/index.html'));
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('db:test-connection', async (event, config) => {
  try {
    const result = await testConnection(config.type, config)
    return { success: true, ...result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Connect to Database

ipcMain.handle('db:connect', async (event, config) => {
  try {
    const driver = createDriver({ ...config, config: { type: config.type } })
    const { PrimaryUnique, databases, connection } =
      await driver.connect(config)

    activeConnections.set(config.id, { connection, config, databases })
    activeConnections.set('currentActiveDatabase', config.id)
    primaryUnique.set(config.id, PrimaryUnique)

    // ✅ Send event to renderer after connection success
    // if (window) {
    mainWindow.webContents.send('db:connected', {
      id: config.id,
      type: config.type,
      databases,
      message: `${config.type.toUpperCase()} connected successfully!`,
    })
    // }
    return { success: true, databases }
  } catch (error) {
    console.log(error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle(
  'db:get-tables',
  async (event, { connectionId, db, refresh }) => {
    try {
      const conn = activeConnections.get(connectionId)
      if (!conn) throw new Error('Please connect your database')
      const driver = createDriver(conn, activeConnections)
      const tables = await driver.getTables(db, refresh)
      activeConnections.set('currentActiveDatabase', connectionId)
      return { success: true, tables, allQueries: '' }
    } catch (error) {
      console.log(error)
      return { success: false, message: error.message }
    }
  }
)

ipcMain.handle(
  'db:get-table-data',
  async (event, { connectionId, tableName, limit = 100, offset = 0 }) => {
    try {
      const conn = activeConnections.get(connectionId)
      if (!conn) throw new Error('Please connect your database')
      const driver = createDriver(conn)
      const result = await driver.getTableData(tableName, limit, offset)

      activeConnections.set('currentActiveDatabase', connectionId)

      return { success: true, data: result }
    } catch (error) {
      console.log(error)
      return { success: false, error: error.message }
    }
  }
)

ipcMain.handle('db:get:session', async (event, databaseName = '') => {
  return Object.fromEntries(
    Array.from(activeConnections.entries()).map(([connectionId, connData]) => {
      if (connectionId === 'currentActiveDatabase') {
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
})

ipcMain.handle('db:delete:table', async (event, { connection, tableName }) => {
  const conn = activeConnections.get(connection.id)
  if (!conn) throw new Error('Please connect your database')
  return await deleteTable(conn, tableName)
})

ipcMain.handle('db:get:structure', async (event, { connection, tableName }) => {
  console.log({ tableName, connection })
  const conn = activeConnections.get(connection.id)
  if (!conn) throw new Error('Please connect your database')
  // fix this part
  // const driver = createDriver(conn);
  // const result = await driver.getTableStructure(query, queryObject);

  // activeConnections.set("currentActiveDatabase", connectionId);
  // return { success: true, data: result };

  return await getTableStructure(conn, tableName)
})

ipcMain.handle(
  'db:execute-query',
  async (event, { connectionId, query, queryObject }) => {
    try {
      const conn = activeConnections.get(connectionId)
      if (!conn) throw new Error('Please connect your database')

      const driver = createDriver(conn, activeConnections)
      const result = await driver.executeQuery(query, queryObject)

      activeConnections.set('currentActiveDatabase', connectionId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
)

// Disconnect
ipcMain.handle('db:disconnect', async (event, connectionId) => {
  return await dbDisconnect(activeConnections, connectionId)
})
ipcMain.handle(
  'db:export-table',
  async (event, { connection, tableName, format }) => {
    try {
      if (!connection || !tableName || !format) {
        throw new Error('Missing parameters')
      }

      // ✅ Get table data from your existing dbManager
      //   const driver = createDriver(conn,activeConnections);
      // const tables = await driver.getTables(db, refresh);
      const tableData = await getTableData({ connection, tableName })
      if (!tableData || !Array.isArray(tableData.rows)) {
        throw new Error('No data found or invalid table response')
      }

      const rows = tableData.rows
      let fileContent
      let defaultExt
      let filters

      // ✅ Prepare file content by format
      switch (format) {
        case 'json':
          fileContent = JSON.stringify(rows, null, 2)
          defaultExt = 'json'
          filters = [{ name: 'JSON File', extensions: ['json'] }]
          break

        case 'csv':
          fileContent = parse(rows)
          defaultExt = 'csv'
          filters = [{ name: 'CSV File', extensions: ['csv'] }]
          break

        case 'sql':
          defaultExt = 'sql'
          filters = [{ name: 'SQL File', extensions: ['sql'] }]

          const columns = Object.keys(rows[0] || {})
          const insertStatements = rows.map((row) => {
            const values = columns
              .map((col) => {
                const val = row[col]
                if (val === null || val === undefined) return 'NULL'
                if (typeof val === 'number') return val
                return `'${String(val).replace(/'/g, "''")}'`
              })
              .join(', ')
            return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`
          })
          fileContent = insertStatements.join('\n')
          break

        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      // 🗂 Ask user where to save the file
      const { filePath } = await dialog.showSaveDialog({
        title: `Export ${tableName} as ${format.toUpperCase()}`,
        defaultPath: path.join(os.homedir(), `${tableName}.${defaultExt}`),
        filters,
      })

      if (!filePath) {
        return { success: false, message: 'Export cancelled by user' }
      }

      // 💾 Save file
      await fs.writeFile(filePath, fileContent, 'utf8')

      return {
        success: true,
        message: `Table "${tableName}" exported successfully as ${format.toUpperCase()}`,
        filePath,
      }
    } catch (err) {
      console.error('Export failed:', err)
      return { success: false, message: err.message }
    }
  }
)

ipcMain.handle('db:get-columns', async (event, payload) => {
  const { connectionId, table, limit = 100, offset = 0 } = payload

  try {
    const conn = activeConnections.get(connectionId)
    if (!conn) throw new Error('Please connect your database')

    const driver = createDriver(conn, activeConnections)
    const columns = await driver.getColumns(table, { limit, offset })

    return { success: true, columns }
  } catch (err) {
    console.error('❌ getColumns error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('list-binaries', async () => {
  return DbEngine.listBinaries()
})

ipcMain.handle('list-instances', async () => {
  return DbEngine.listInstances()
})

ipcMain.handle('create-instance', async (event, engine, port, version) => {
  return await DbEngine.createInstance(engine, port, version)
})

ipcMain.handle('start-instance', async (event, id) => {
  return DbEngine.startInstance(id)
})

ipcMain.handle('stop-instance', async (event, id) => {
  return DbEngine.stopInstance(id)
})

ipcMain.handle('delete-instance', async (event, id) => {
  return DbEngine.deleteInstance(id)
})

ipcMain.handle('get-connection-info', async (event, id) => {
  return DbEngine.getConnectionInfo(id)
})

ipcMain.handle('get-instance-logs', async (event, id) => {
  return DbEngine.getInstanceLogs(id)
})
