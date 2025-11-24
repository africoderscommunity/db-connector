import React, { useEffect, useState } from 'react'
import {
  Layers,
  ChevronRight,
  Copy,
  Pin,
  Download,
  Upload,
  Plus,
  FileCode,
  Filter,
  Trash2,
  X,
} from 'lucide-react'
import { useDatabase } from '../../context/DatabaseContext'
import { useAppContext } from '../../context/AppContext'
import StructureModal from './StructureModal'
import CreateTableModal from './CreateTableModal'

export default function ActiveConnectionData() {
  const {
    setActiveTable,
    tables,
    LoadDbTable,
    activeConnection,
    loadTableData,
    selectedTable,
    createTable,
  } = useDatabase()
  const { connectionStatus } = useAppContext()
  const [contextMenu, setContextMenu] = useState(null)
  const [showStructureModal, setShowStructureModal] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportTable, setExportTable] = useState(null)

  const savedTablesKey = `db_tables_${activeConnection?.id}`
  const cachedTables = JSON.parse(localStorage.getItem(savedTablesKey))

  if (!activeConnection) {
    return <div className="text-gray-500 p-4">No active connection</div>
  }
  const handleExport = (format) => {
    setShowExportModal(false)
    if (!exportTable) return

    alert(`Exporting ${exportTable} as ${format.toUpperCase()}...`)

    window.electron.db
      .exportTable({
        connection: activeConnection,
        tableName: exportTable,
        format,
      })
      .then((res) => {
        if (res.success) {
          alert(
            `✅ Table '${exportTable}' exported successfully to ${res.filePath}`
          )
        } else {
          alert(`❌ Export failed: ${res.message}`)
        }
      })
      .catch((err) => {
        console.error(err)
        alert(`❌ Error exporting table: ${err.message}`)
      })
  }

  const handleContextMenu = (e, table) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      table: table,
    })
  }

  const handleCreateTable = () => {
    setShowMenu(false)
    setShowCreateModal(true)
  }

  const handleConfirmCreateTable = async (tableName) => {
    try {
      await createTable(tableName)
      setShowCreateModal(false)
    } catch (error) {
      // Error already handled in createTable function
      console.error('Create table error:', error)
    }
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const handleTableClick = (table) => {
    loadTableData(table)
    setActiveTable(table)
    closeContextMenu()
  }

  // ✅ Added: Handle double-click to open table immediately
  const handleTableDoubleClick = (table) => {
    console.log(`Double-clicked on ${table}`)
    loadTableData(table)
    setActiveTable(table)
  }

  const handleAction = (action, table) => {
    closeContextMenu()

    switch (action) {
      case 'open-new-tab':
        alert(`Opening ${table} in new tab`)
        break
      case 'structure':
        setShowStructureModal(table)
        break
      case 'overview':
        alert(`Showing overview for ${table}`)
        break
      case 'copy-name':
        navigator.clipboard.writeText(table)
        alert(`Copied: ${table}`)
        break
      case 'pin':
        alert(`Pinned ${table} to top`)
        break
      case 'export':
        // Open the export modal instead of using window.prompt
        setExportTable(table) // Store which table is being exported
        setShowExportModal(true) // Show the modal
        break

      case 'import':
        alert(`Import data to ${table}`)
        break
      case 'new':
        alert(`Create new item in ${table}`)
        break
      case 'copy-script':
        alert(`Copy script for ${table}`)
        break
      case 'clone':
        alert(`Clone table ${table}`)
        break
      case 'truncate':
        if (
          confirm(
            `Are you sure you want to truncate ${table}? This will delete all data.`
          )
        ) {
          alert(`Truncating ${table}`)
        }
        break
      case 'delete':
        if (
          confirm(
            `Are you sure you want to delete ${table}? This action cannot be undone.`
          )
        ) {
          window.electron.db
            .deleteTable({
              connection: activeConnection,
              tableName: table,
            })
            .then((res) => {
              alert(res.message)
              if (res.success) {
                LoadDbTable({
                  connectionId: activeConnection.id,
                  refresh: true,
                })
              }
            })
        }
        break
    }
  }

  //  useEffect(() => {
  //     const handleClick = () => closeContextMenu();
  //     document.addEventListener('click', handleClick);
  //     return () => document.removeEventListener('click', handleClick);
  //   }, []);

  return (
    tables && (
      <>
        <div className="w-56 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400">
                TABLES ({tables?.length || 0})
              </h2>

              {/* 3-dot menu */}
              <div className="relative">
                {tables && (
                  <button
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="p-1 hover:bg-gray-700 rounded-lg transition"
                  >
                    <span className="text-gray-300 text-xl">⋮</span>
                  </button>
                )}

                {showMenu && tables && (
                  <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        setShowMenu(false)

                        LoadDbTable({
                          connectionId: activeConnection.id,
                          refresh: true,
                        })
                        //   alert('Refreshing tables...');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                    >
                      🔁 Refresh Tables
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        setShowCreateModal(true)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                    >
                      ➕ Create Table
                    </button>
                  </div>
                )}
              </div>
            </div>

            {tables?.length ? (
              tables
                .sort((a, b) => a.localeCompare(b))
                .map((table) => (
                  <div
                    key={table}
                    onClick={() => handleTableClick(table)}
                    onDoubleClick={() => handleTableDoubleClick(table)} // ✅ Added double-click
                    onContextMenu={(e) => handleContextMenu(e, table)}
                    className={`p-2 mb-1 rounded cursor-pointer flex items-center gap-2 transition ${
                      selectedTable === table
                        ? 'bg-blue-600'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <Layers className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{table}</span>
                  </div>
                ))
            ) : (
              <></>
            )}
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-gray-800 rounded-lg shadow-2xl border border-gray-700 py-2 z-50 min-w-[220px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* <MenuItem
            icon={<ChevronRight className="w-4 h-4" />}
            label="Open in new tab"
            onClick={() => handleAction('open-new-tab', contextMenu.table)}
          /> */}
            <MenuItem
              icon={<Layers className="w-4 h-4" />}
              label="Open structure"
              onClick={() => handleAction('structure', contextMenu.table)}
            />
            {/* <MenuItem
            icon={<FileCode className="w-4 h-4" />}
            label="Item overview"
            onClick={() => handleAction('overview', contextMenu.table)}
          />

          <MenuDivider />

          <MenuItem
            icon={<Copy className="w-4 h-4" />}
            label="Copy name"
            onClick={() => handleAction('copy-name', contextMenu.table)}
          /> */}
            {/* <MenuItem
            icon={<Pin className="w-4 h-4" />}
            label="Pin to top"
            onClick={() => handleAction('pin', contextMenu.table)}
          />

          <MenuDivider />

          <MenuItem
            icon={<Upload className="w-4 h-4" />}
            label="Import"
            hasSubmenu
            onClick={() => handleAction('import', contextMenu.table)}
          />

          <MenuDivider /> */}
            {/* 
          <MenuItem
            icon={<Plus className="w-4 h-4" />}
            label="New"
            hasSubmenu
            onClick={() => handleAction('new', contextMenu.table)}
          />
          <MenuItem
            icon={<FileCode className="w-4 h-4" />}
            label="Copy Script As"
            hasSubmenu
            onClick={() => handleAction('copy-script', contextMenu.table)}
          />

          <MenuDivider />

          <MenuItem
            icon={<Copy className="w-4 h-4" />}
            label="Clone..."
            onClick={() => handleAction('clone', contextMenu.table)}
          />
          <MenuItem
            icon={<Filter className="w-4 h-4" />}
            label="Truncate..."
            onClick={() => handleAction('truncate', contextMenu.table)}
            shortcut="⌘⌫"
          /> */}

            <MenuItem
              icon={<Download className="w-4 h-4" />}
              label="Export"
              hasSubmenu
              onClick={() => handleAction('export', contextMenu.table)}
            />
            <MenuItem
              icon={<Trash2 className="w-4 h-4" />}
              label="Delete..."
              onClick={() => handleAction('delete', contextMenu.table)}
              shortcut="⌘⌫"
              danger
            />
          </div>
        )}

        {/* Structure Modal */}
        {showStructureModal && (
          <StructureModal
            tableName={showStructureModal}
            onClose={() => setShowStructureModal(null)}
            connection={activeConnection}
          />
        )}

        {/* ✅ Export Modal */}
        {showExportModal && (
          <ExportModal
            table={exportTable}
            onClose={() => setShowExportModal(false)}
            onExport={handleExport}
          />
        )}

        {/* ✅ Create Table Modal */}
        {showCreateModal && (
          <CreateTableModal
            onClose={() => setShowCreateModal(false)}
            onConfirm={handleConfirmCreateTable}
          />
        )}
      </>
    )
  )
}

function MenuItem({ icon, label, onClick, hasSubmenu, shortcut, danger }) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-2 flex items-center gap-3 cursor-pointer transition ${
        danger
          ? 'hover:bg-red-600 text-red-400 hover:text-white'
          : 'hover:bg-gray-700 text-gray-200'
      }`}
    >
      {icon}
      <span className="flex-1 text-sm">{label}</span>
      {hasSubmenu && <ChevronRight className="w-4 h-4 text-gray-500" />}
      {shortcut && <span className="text-xs text-gray-500">{shortcut}</span>}
    </div>
  )
}

function MenuDivider() {
  return <div className="h-px bg-gray-700 my-1"></div>
}

// ✅ Export Modal Component
function ExportModal({ table, onClose, onExport }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl w-96">
        <h3 className="text-white text-lg mb-4">Export {table}</h3>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onExport('sql')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            SQL
          </button>
          <button
            onClick={() => onExport('json')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            JSON
          </button>
          <button
            onClick={() => onExport('csv')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            CSV
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
