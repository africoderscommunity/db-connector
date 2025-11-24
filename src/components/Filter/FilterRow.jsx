import { filterOptions } from "../../utils/filters/operators.js"

export default function FilterRow({ filter, index, tableData, onChange, onAdd, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      {/* Enabled */}
      <input
        type="checkbox"
        checked={filter.enabled}
        onChange={(e) => onChange(index, "enabled", e.target.checked)}
      />

      {/* Column */}
      <select
        className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1"
        value={filter.column}
        onChange={(e) => onChange(index, "column", e.target.value)}
      >
        <option value="">Any column</option>
        {tableData.columns.map((col, i) => (
          <option key={i} value={col}>{col}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1"
        value={filter.operator}
        onChange={(e) => onChange(index, "operator", e.target.value)}
      >
        {filterOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Value */}
      <input
        type="text"
        className="flex-1 bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-2 py-1"
        placeholder="Value"
        value={filter.value}
        onChange={(e) => onChange(index, "value", e.target.value)}
      />

      {/* Remove */}
      <button
        className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded px-2 py-1"
        onClick={() => onRemove(index)}
      >
        -
      </button>

      {/* Add */}
      {index === 0 && (
        <button
          className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded px-2 py-1"
          onClick={onAdd}
        >
          +
        </button>
      )}
    </div>
  )
}
