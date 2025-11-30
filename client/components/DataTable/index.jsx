import { useState } from 'react'
import { useDatabase } from '../../context/DatabaseContext'
import { ConfirmModal, DiscardModal, JsonEditModal, TableRow } from './components'
import { useTableUpdates, useTableKeyboardShortcuts, useJsonModal } from './hooks'

export default function DataTable() {
  const [activeMenu, setActiveMenu] = useState(null)

  const {
    tableData: ValidTableData,
    setTableData: setValidTableData,
    setQueryText,
    selectedTable,
    activeConnection,
    executeQuery,
  } = useDatabase()

  const dbType = activeConnection?.type

  // Custom hooks
  const {
    changedCells,
    pendingQuery,
    confirmModalOpen,
    discardModalOpen,
    handleEdit,
    handleUpdate,
    handleUpdateAll,
    confirmUpdateAll,
    handleDiscard,
    setConfirmModalOpen,
    setDiscardModalOpen,
  } = useTableUpdates(
    ValidTableData,
    setValidTableData,
    dbType,
    selectedTable,
    setQueryText,
    executeQuery
  )

  const {
    modalOpen,
    modalContent,
    editingCell,
    setEditingCell,
    setModalOpen,
    setModalContent,
    handleCellClick,
    handleSaveJsonEdit,
    handleCopyToClipboard,
  } = useJsonModal(handleEdit)

  useTableKeyboardShortcuts(changedCells, handleUpdateAll, setDiscardModalOpen)

  // Handle menu toggle
  const handleMenuToggle = (i) => {
    setActiveMenu(activeMenu === i ? null : i)
  }

  // Early return if no data
  if (!ValidTableData?.columns?.length || !ValidTableData?.rows?.length) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center text-gray-400 text-lg">
        No data available
      </div>
    )
  }

  return (
    <>
      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmUpdateAll}
        pendingQuery={pendingQuery}
      />

      <DiscardModal
        isOpen={discardModalOpen}
        onClose={() => setDiscardModalOpen(false)}
        onConfirm={handleDiscard}
      />

      <JsonEditModal
        isOpen={modalOpen}
        modalContent={modalContent}
        onContentChange={setModalContent}
        onSave={handleSaveJsonEdit}
        onCopy={handleCopyToClipboard}
        onClose={() => setModalOpen(false)}
      />

      {/* Table */}
      <div className="overflow-x-auto bg-gray-900 rounded-2xl border border-gray-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800 text-gray-200">
              {ValidTableData.columns.map((col, i) => (
                <th key={i} className="px-5 py-3 text-left">
                  {col}
                </th>
              ))}
              <th className="px-5 py-3 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ValidTableData.rows.map((row, i) => (
              <TableRow
                key={i}
                row={row}
                rowIndex={i}
                columns={ValidTableData.columns}
                changedCells={changedCells}
                editingCell={editingCell}
                activeMenu={activeMenu}
                onEdit={handleEdit}
                onCellClick={handleCellClick}
                setEditingCell={setEditingCell}
                onMenuToggle={handleMenuToggle}
                onUpdate={handleUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
