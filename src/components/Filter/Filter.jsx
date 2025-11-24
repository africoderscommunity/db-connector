import  { useState } from "react"
import { useDatabase } from "../../context/DatabaseContext"

import FilterRow from "./FilterRow"
import { generateMongoQuery } from "../../utils/filters/mongoBuilder"
import { generateMSSQLQuery } from "../../utils/filters/sqlBuilder"

export default function Filter({ tableData }) {
  const [filters, setFilters] = useState([
    { column: "", operator: "equals", value: "", enabled: true }
  ])

  const { activeConnection } = useDatabase()
  const dbType = activeConnection.type?.toLowerCase()

  const handleChange = (i, key, val) => {
    const copy = [...filters]
    copy[i][key] = val
    setFilters(copy)
  }

  const handleAddFilter = () => {
    setFilters([...filters, { column: "", operator: "equals", value: "", enabled: true }])
  }

  const handleRemoveFilter = (i) => {
    setFilters(filters.filter((_, idx) => idx !== i))
  }

  const handleApply = () => {
    const active = filters.filter((f) => f.enabled)
    if (!active.length) return alert("No active filters selected!")

    const query =
      dbType.includes("mongo") || dbType === "nosql"
        ? generateMongoQuery(active)
        : generateMSSQLQuery(active)

    console.log("Generated Query:", query)
    alert(JSON.stringify(query, null, 2))
  }

  if (!tableData?.columns) return null

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-3 flex flex-col gap-2 overflow-auto h-full">
      {filters.map((f, i) => (
        <FilterRow
          key={i}
          tableData={tableData}
          filter={f}
          index={i}
          onChange={handleChange}
          onAdd={handleAddFilter}
          onRemove={handleRemoveFilter}
        />
      ))}

      <button
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded px-3 py-1 self-start"
        onClick={handleApply}
      >
        Apply Filters
      </button>
    </div>
  )
}
