import Header from './components/Header.jsx'
import Connection from './components/Connection.jsx'
import EmptyState from './components/EmptyState.jsx'
import ActiveConnection from './components/ActiveConnectionData/ActiveConnectionData.jsx'
import AddConnectionModal from './components/AddConnectionModal.jsx'
import DbEngine from './components/dbEngin.jsx'
import VisualSchemaExplorer from './components/visualSchema.jsx'
import MainPanels from './components/MainPanels.jsx'
import { useDatabase } from './context/DatabaseContext.jsx'
import { useAppContext } from './context/AppContext.jsx'
import { useDBConnectorLogic } from './hooks/useDBConnectorLogic.js'

export default function DBConnector() {
  useDBConnectorLogic()

  const { activeConnection, tableData } = useDatabase()
  const { activeTab, showAddForm } = useAppContext()

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      <Header />

      {activeTab === 'Connections' && (
        <>
          <div className="flex-1 flex overflow-hidden">
            <Connection />

            {activeConnection && <ActiveConnection />}

            <div className="flex-1 flex flex-col overflow-hidden">
              {!activeConnection ? (
                <EmptyState />
              ) : (
                <MainPanels tableData={tableData} />
              )}
            </div>
          </div>

          {showAddForm && <AddConnectionModal />}
        </>
      )}

      {activeTab === 'Db Engine' && <DbEngine />}
      {activeTab === 'Visual Schema' && <VisualSchemaExplorer />}
    </div>
  )
}
