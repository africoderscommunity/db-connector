import React, { useEffect, useState } from 'react'
import { Layers, X } from 'lucide-react'

export default function StructureModal({ tableName, onClose, connection }) {
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tableMeta, setTableMeta] = useState({
    engine: 'Unknown',
    collation: 'Unknown',
    rows: 0,
  })

  useEffect(() => {
    const loadStructure = async () => {
      try {
        setLoading(true)
        const res = await window.electron.db.getTableStructure({
          connection,
          tableName,
        })
        console.log('🔍 Table Structure Response:', res)

        if (res.success) {
          // MySQL / Postgres response
          setColumns(res.columns || [])
          setTableMeta({
            engine: res.engine || 'InnoDB',
            collation: res.collation || 'utf8mb4_unicode_ci',
            rows: res.rows || 0,
          })
        } else if (res.meta) {
          // MSSQL response from our new structure
          setColumns(res.columns || [])
          setTableMeta({
            engine: res.meta.Engine || 'MSSQL',
            collation: res.meta.Collation || 'Unknown',
            rows: res.meta.Rows || 0,
          })
        } else if (Array.isArray(res)) {
          // fallback array-only return
          setColumns(res)
        } else {
          setError(res.message || 'Failed to load structure')
        }
      } catch (err) {
        console.error(err)
        setError('Error fetching structure')
      } finally {
        setLoading(false)
      }
    }
    loadStructure()
  }, [tableName, connection])

  const formatDefault = (value) => {
    if (!value || value === null) {
      return <span className="italic text-gray-500">NULL</span>
    }
    return (
      <span
        className="text-gray-300 break-all whitespace-pre-wrap"
        title={String(value)}
      >
        {String(value)}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Table Structure: {tableName}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              View column definitions, foreign keys, and properties
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-10">
              Loading table structure...
            </div>
          ) : error ? (
            <div className="text-center text-red-400 text-sm py-10">
              {error}
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        Column
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        Nullable
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        Key
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        Default
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        Extra
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                        Foreign Key
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {columns.length ? (
                      columns.map((col, i) => (
                        <tr key={i} className="hover:bg-gray-800/50 transition">
                          <td className="px-4 py-3 text-sm text-white font-medium">
                            {col.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-400">
                            {col.type}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {col.nullable === 'YES' || col.nullable === true ? (
                              <span className="text-green-400">YES</span>
                            ) : (
                              <span className="text-red-400">NO</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {col.key ? (
                              <span className="px-2 py-1 bg-indigo-600 text-white text-xs rounded">
                                {col.key}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm max-w-[300px]">
                            {formatDefault(col.default)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 break-all">
                            {col.extra || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300 break-all">
                            {col.foreignKey ? (
                              <span className="text-yellow-400">
                                {col.foreignKey}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center text-gray-500 text-sm py-6"
                        >
                          No columns found for this table
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Engine</div>
                  <div className="text-lg font-semibold text-white">
                    {tableMeta.engine}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Collation</div>
                  <div className="text-lg font-semibold text-white">
                    {tableMeta.collation}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Rows</div>
                  <div className="text-lg font-semibold text-white">
                    {tableMeta.rows}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-900 px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
          >
            Close
          </button>
          <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition">
            Edit Structure
          </button>
        </div>
      </div>
    </div>
  )
}
