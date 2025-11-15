import { createContext, useContext, useState } from 'react'
import { useAppContext as useApp } from './AppContext'
import { dbService } from '../services/dbService'
import { getDefaultPort } from '../utils/dbUtils'

const DatabaseContext = createContext()

export const DatabaseProvider = ({ children }) => {
  const {
    setShowAddForm,
    setEditingId,
    editingId,
    addLog,
    connectionStatus,
    setConnectionStatus,
  } = useApp()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [queryResult, setQueryResult] = useState(null)
  const [activeConnection, setActiveConnection] = useState(null)
  const [connectingId, setConnectingId] = useState(null)
  const [tables, setTables] = useState([])
  const [queryText, setQueryText] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [tableData, setTableData] = useState(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connections, setConnections] = useState([])
  const [activeTable, setActiveTable] = useState([])
  const [offset, setOffset] = useState(0)
  const [selectedTable, setSelectedTable] = useState(null)
  const [schemaMetadata, setSchemaMetadata] = useState({})

  const [formData, setFormData] = useState({
    name: '',
    type: 'mysql',
    host: 'localhost',
    port: '',
    database: '',
    username: '',
    password: '',
    mongoUrlLink: '',
  })

  // ---- Database Operations ----
  const connectToDatabase = async (conn, loadTables = true) =>
    await dbService.connectToDatabase(conn, loadTables, {
      setLoading,
      setError,
      setActiveConnection,
      setTables,
      setConnectingId,
    })

  const LoadDbTable = async (tableConfig) =>
    await dbService.LoadDbTable(tableConfig, { setTables })

  const testConnection = async () =>
    await dbService.testConnection(formData, { setTestingConnection, setError })

  const saveConnections = async (conns) => {
    localStorage.setItem('db_connections', JSON.stringify(conns))
    setConnections(conns)
  }

  const addConnection = async () =>
    await dbService.addConnection({
      formData,
      editingId,
      connections,
      saveConnections,
      setFormData,
      setShowAddForm,
      setEditingId,
      setError,
    })

  const editConnection = async (conn) =>
    await dbService.editConnection({
      setFormData,
      setShowAddForm,
      setEditingId,
      conn,
    })
  const exportData = (data) => dbService.exportData(selectedTable)(data)
  const loadTableData = async (tableName, options = {}) =>
    await dbService.loadTableData(tableName, {
      ...options,
      activeConnection,
      connectionId: activeConnection.id || connectingId,
      setLoading,
      setSelectedTable,
      setQueryResult,
      setTableData,
      setOffset,
      setTotalCount,
      setError,
    })
  const executeQuery = (query, queryObject = {}) =>
    dbService.executeQuery(query, (queryObject = {}), {
      activeConnection,
      setError,
      setLoading,
      setTableData,
      addLog,
      setSelectedTable,
      queryText,
    })

  const deleteConnection = (id) =>
    dbService.deleteConnection(id, {
      activeConnection,
      setActiveConnection,
      setTables,
      setSelectedTable,
      setTableData,
      connections,
      saveConnections,
    })

  const loadConnections = () => {
    const stored = localStorage.getItem('db_connections')
    if (stored) {
      console.log({ stored })
      setConnections(JSON.parse(stored))
    }
  }

  const loadSchemaMetadata = async (connectionId = activeConnection?.id) => {
    try {
      const result = await window.electron.db.getTables({ connectionId })
      if (!result?.success) return
      const cachedAutoCompletionData =
        connectionStatus?.[connectionId]?.autoCompletion
      if (connectionStatus?.[connectionId]?.autoCompletion) {
        setSchemaMetadata(cachedAutoCompletionData)
        return
      }
      const metadata = {}
      for (const table of result.tables) {
        console.log({ table })
        const columnsRes = await window.electron.db.getColumns({
          connectionId,
          table,
        })
        if (columnsRes?.success && Array.isArray(columnsRes.columns)) {
          metadata[table] = columnsRes.columns.map((c) => c.name)
        }
      }
      setSchemaMetadata(metadata)
    } catch (err) {
      console.error('❌ Failed to load schema metadata:', err)
    }
  }

  return (
    <DatabaseContext.Provider
      value={{
        loading,
        setLoading,
        error,
        setError,
        queryResult,
        setQueryResult,
        activeConnection,
        setActiveConnection,
        connectingId,
        setConnectingId,
        tables,
        setTables,
        connectToDatabase,
        LoadDbTable,
        queryText,
        setQueryText,
        totalCount,
        setTotalCount,
        tableData,
        setTableData,
        testingConnection,
        setTestingConnection,
        addConnection,
        testConnection,
        editConnection,
        formData,
        setFormData,
        connections,
        setConnections,
        offset,
        setOffset,
        saveConnections,
        getDefaultPort,
        activeTable,
        setActiveTable,
        selectedTable,
        setSelectedTable,
        exportData,
        loadSchemaMetadata,
        loadTableData,
        loadConnections,
        deleteConnection,
        executeQuery,
        schemaMetadata,
        setSchemaMetadata,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => {
  const context = useContext(DatabaseContext)
  if (!context)
    throw new Error('useDatabase must be used within DatabaseProvider')
  return context
}
