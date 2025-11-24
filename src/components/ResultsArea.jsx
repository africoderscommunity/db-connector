import React from 'react'
import { XCircle, RefreshCw, Download } from 'lucide-react'
import DataTable from './DataTable/index'
import { useDatabase } from '../context/DatabaseContext'
import { useAppContext as useApp } from '../context/AppContext'

// --- Header Component ---
function ResultsHeader({ selectedTable, tableData, exportData }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold">{selectedTable}</h3>
      <button
        onClick={() => exportData(tableData)}
        className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
      >
        <Download className="w-4 h-4" />
        Export CSV
      </button>
    </div>
  )
}

// --- Content Component ---
function ResultsContent({ error, loading, tableData, queryResult, selectedTable, exportData }) {
  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded mb-4 flex items-start gap-2">
        <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  if (tableData && !queryResult) {
    return (
      <div>
        <ResultsHeader selectedTable={selectedTable} tableData={tableData} exportData={exportData} />
        <DataTable />
      </div>
    )
  }

  return null
}

// --- Pagination Component ---
function ResultsPagination({ tableData, totalCount, offset, limit, selectedTable, loadTableData }) {
  if (!tableData || !totalCount) return null

  return (
    <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4 py-3 mt-[5px]">
      <button
        onClick={() => loadTableData(selectedTable, Math.max(0, offset - limit))}
        disabled={offset === 0}
        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50"
      >
        ← Previous
      </button>

      <span className="text-sm text-gray-400">
        Page {Math.floor(offset / limit) + 1} of {Math.ceil(totalCount / limit)}
      </span>
      <span className="ml-2 text-gray-500">• Total: {totalCount}</span>

      <button
        onClick={() => {
          const newOffset = offset + limit
          console.log(newOffset, offset, limit)
          if (newOffset < totalCount) loadTableData(selectedTable, { newOffset })
        }}
        disabled={offset + limit >= totalCount}
        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50"
      >
        Next →
      </button>
    </div>
  )
}

// --- Main Component ---
export default function ResultsArea() {
  const {
    error,
    loading,
    tableData,
    queryResult,
    totalCount,
    offset,
    activeConnection,
    exportData,
    selectedTable,
    loadTableData,
  } = useDatabase()
  const { limit } = useApp()

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      <div className="flex-1 overflow-auto p-4">
        <ResultsContent
          error={error}
          loading={loading}
          tableData={tableData}
          queryResult={queryResult}
          selectedTable={selectedTable}
          exportData={exportData}
        />
      </div>
      <ResultsPagination
        tableData={tableData}
        totalCount={totalCount}
        offset={offset}
        limit={limit}
        selectedTable={selectedTable}
        loadTableData={loadTableData}
      />
    </div>
  )
}
