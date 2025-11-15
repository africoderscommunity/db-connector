import React, { createContext, useContext, useState } from 'react'

export const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [activeConnection, setActiveConnection] = useState(null)
  const [tableData, setTableData] = useState(null)
  const [queryResult, setQueryResult] = useState(null)
  const [filters, setFilters] = useState([])
  const [dbType, setDbType] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [logs, setLogs] = useState([])
  const [limit, setLimit] = useState(100)
  const [activeTab, setActiveTab] = useState('Connections') // Tab state

  const [connectionStatus, setConnectionStatus] = useState()

  const addLog = (type, message) => {
    setLogs((prev) => [
      ...prev,
      {
        type,
        message: message.split('<->').join('<br/>'),
        time: new Date().toLocaleTimeString(),
      },
    ])
  }

  return (
    <AppContext.Provider
      value={{
        activeConnection,
        setActiveConnection,
        tableData,
        setTableData,
        queryResult,
        setQueryResult,
        filters,
        setFilters,
        dbType,
        setDbType,
        editingId,
        setEditingId,
        showAddForm,
        setShowAddForm,
        connectionStatus,
        setConnectionStatus,
        logs,
        setLogs,
        limit,
        setLimit,
        addLog,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)
