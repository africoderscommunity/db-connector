import React, { useState, useEffect } from 'react'
import { Database, Plus } from 'lucide-react'
import ActiveConnection from './components/ActiveConnectionData/ActiveConnectionData.jsx'
import EmptyState from './components/EmptyState.jsx'
import QueryEditor from './components/QueryEditor.jsx'
import ResultsArea from './components/ResultsArea.jsx'
import AddConnectionModal from './components/AddConnectionModal.jsx'
import Connection from './components/Connection.jsx'
import Header from './components/Header.jsx'
import DbEngine from './components/dbEngin.jsx'
import Filter from './components/Filter.jsx'
import LogsPanel from './components/LogsPanel.jsx'
import { useDatabase } from './context/DatabaseContext'
import { useAppContext } from './context/AppContext.jsx'
import VisualSchemaExplorer from './components/visualSchema.jsx'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

export default function DBConnector() {
  const {
    error,
    setError,
    activeConnection,
    tableData,
    loadConnections,
    setActiveConnection,
    setTables,
  } = useDatabase()
  const {
    showAddForm,
    connectionStatus,
    setConnectionStatus,
    activeTab,
    setActiveTab,
  } = useAppContext()

  console.log({ activeTab })

  useEffect(() => {
    loadConnections()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (error) {
        setError(error ? null : error)
      }
    }, 4000)

    return () => clearTimeout(timer)
  }, [error])

  useEffect(() => {
    // Listen for DB connection events
    window.electron.onDbConnected((payload) => {
      alert(payload.message)
      setConnectionStatus((conStat) => ({
        ...conStat,
        [payload.id]: {
          status: true,
          connectionId: payload.id,
          databases: payload.databases,
        },
      }))
    })

    return () => {
      // Optionally remove listener
      // window.electron.removeDbConnectedListener();
    }
  }, [])

  useEffect(() => {
    window.electron.db.getSessionStatus().then((res) => {
      console.log(res)
      if (JSON.stringify(connectionStatus) !== JSON.stringify(res)) {
        const currentActiveDatabase = res[res?.currentActiveDatabase]
        if (currentActiveDatabase) {
          const { config: cachedConnection, tables } =
            res[res?.currentActiveDatabase]
          console.log({ tables })
          if (cachedConnection) {
            setActiveConnection(res[res?.currentActiveDatabase]?.config)
            setConnectionStatus(res)
            setTables(tables)
          }
        }
      }
    })
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      <Header />

      {activeTab == 'Connections' && (
        <>
          {/* Header */}

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - Connections */}
            <Connection />

            <>
              {/* Tables Sidebar */}
              {activeConnection && <ActiveConnection />}

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {!activeConnection ? (
                  <EmptyState />
                ) : (
                  <PanelGroup direction="vertical">
                    {/* Filter Panel */}
                    <Panel defaultSize={10} minSize={10}>
                      {tableData && <Filter tableData={tableData} />}
                    </Panel>
                    <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-blue-500 cursor-row-resize transition-colors" />

                    {/* Query Editor */}
                    <Panel defaultSize={20} minSize={10}>
                      <QueryEditor />
                    </Panel>
                    <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-blue-500 cursor-row-resize transition-colors" />

                    {/* Results Area */}
                    <Panel defaultSize={50} minSize={30}>
                      <ResultsArea />
                    </Panel>
                    <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-blue-500 cursor-row-resize transition-colors" />

                    {/* Logs Panel */}
                    <Panel defaultSize={20} minSize={10}>
                      <div className="h-full bg-gray-950 text-gray-300 p-3 font-mono text-sm overflow-auto border-t border-gray-800">
                        <h3 className="text-gray-400 text-xs mb-2 uppercase tracking-wide">
                          Logs
                        </h3>
                        <LogsPanel />
                      </div>
                    </Panel>
                  </PanelGroup>
                )}
              </div>
            </>
          </div>

          {showAddForm && <AddConnectionModal />}
        </>
      )}
      {activeTab == 'Db Engine' && <DbEngine />}
      {activeTab == 'Visual Schema' && <VisualSchemaExplorer />}
      {/* : activeTab === "DB Engine" ? (
  <DBEngineComponent />
) : (
  <>
      {}}
    
  </> */}
      {/* )} */}
    </div>
  )
}
