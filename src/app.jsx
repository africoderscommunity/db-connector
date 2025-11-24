import Header from './components/Header'
import Connection from './components/Connection'
import EmptyState from './components/EmptyState'
import ActiveConnection from './components/ActiveConnectionData/ActiveConnectionData'
import AddConnectionModal from './components/AddConnectionModal'
import DbEngine from './components/dbEngin'
import VisualSchemaExplorer from './components/visualSchema'
import MainPanels from './components/MainPanels'
import { useDatabase } from './context/DatabaseContext'
import { useAppContext } from './context/AppContext'
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
