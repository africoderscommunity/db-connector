import React, { useState } from "react";
import { useDatabase } from '../context/DatabaseContext'

export default function Filter({ tableData }) {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState([
    { column: "", operator: "equals", value: "", enabled: true },
  ]);
 
const { activeTable , activeConnection } = useDatabase()  
const dbType = activeConnection.type
    const filterOptions = [
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Not Contains" },
    { value: "between", label: "Between" },
    { value: "not_between", label: "Not Between" },
    { value: "has_prefix", label: "Has Prefix" },
    { value: "has_suffix", label: "Has Suffix" },
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "is_null", label: "Is Null" },
    { value: "is_not_null", label: "Is Not Null" },
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
    { value: "greater_or_equal", label: "Greater or Equal" },
    { value: "less_or_equal", label: "Less or Equal" },
    { value: "starts_with", label: "Starts With" },
    { value: "ends_with", label: "Ends With" },
    { value: "in", label: "In" },
    { value: "not_in", label: "Not In" },
  ];

  const handleChange = (index, key, value) => {
    const newFilters = [...filters];
    newFilters[index][key] = value;
    setFilters(newFilters);
  };

  const handleAddFilter = () => {
    setFilters([
      ...filters,
      { column: "", operator: "equals", value: "", enabled: true },
    ]);
  };

  const handleRemoveFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };


  const generateMongoQuery = (activeFilters) => {
  const query = {};

  for (const f of activeFilters) {
    const { column, operator, value } = f;
    if (!column) continue;

    switch (operator) {
      case "equals":
        query[column] = value;
        break;
      case "not_equals":
        query[column] = { $ne: value };
        break;
      case "contains":
        query[column] = { $regex: value, $options: "i" };
        break;
      case "not_contains":
        query[column] = { $not: { $regex: value, $options: "i" } };
        break;
      case "starts_with":
      case "has_prefix":
        query[column] = { $regex: `^${value}`, $options: "i" };
        break;
      case "ends_with":
      case "has_suffix":
        query[column] = { $regex: `${value}$`, $options: "i" };
        break;
      case "greater_than":
        query[column] = { $gt: value };
        break;
      case "less_than":
        query[column] = { $lt: value };
        break;
      case "greater_or_equal":
        query[column] = { $gte: value };
        break;
      case "less_or_equal":
        query[column] = { $lte: value };
        break;
      case "between": {
        const [min, max] = value.split(",").map(v => v.trim());
        query[column] = { $gte: min, $lte: max };
        break;
      }
      case "not_between": {
        const [min, max] = value.split(",").map(v => v.trim());
        query[column] = { $not: { $gte: min, $lte: max } };
        break;
      }
      case "is_null":
        query[column] = { $eq: null };
        break;
      case "is_not_null":
        query[column] = { $ne: null };
        break;
      case "in":
        query[column] = { $in: value.split(",").map(v => v.trim()) };
        break;
      case "not_in":
        query[column] = { $nin: value.split(",").map(v => v.trim()) };
        break;
      default:
        break;
    }
  }

  return query;
};


  const generateMSSQLQuery = (activeFilters) => {
     const conditions = activeFilters
    .map(({ column, operator, value }) => {
      if (!column) return "";

      const safeVal = (v) => `'${v.replace(/'/g, "''")}'`;

      switch (operator) {
        case "equals":
          return `[${column}] = ${safeVal(value)}`;
        case "not_equals":
          return `[${column}] != ${safeVal(value)}`;
        case "contains":
          return `[${column}] LIKE '%${value}%'`;
        case "not_contains":
          return `[${column}] NOT LIKE '%${value}%'`;
        case "starts_with":
        case "has_prefix":
          return `[${column}] LIKE '${value}%'`;
        case "ends_with":
        case "has_suffix":
          return `[${column}] LIKE '%${value}'`;
        case "greater_than":
          return `[${column}] > ${safeVal(value)}`;
        case "less_than":
          return `[${column}] < ${safeVal(value)}`;
        case "greater_or_equal":
          return `[${column}] >= ${safeVal(value)}`;
        case "less_or_equal":
          return `[${column}] <= ${safeVal(value)}`;
        case "between": {
          const [min, max] = value.split(",").map(v => v.trim());
          return `[${column}] BETWEEN ${safeVal(min)} AND ${safeVal(max)}`;
        }
        case "not_between": {
          const [min, max] = value.split(",").map(v => v.trim());
          return `[${column}] NOT BETWEEN ${safeVal(min)} AND ${safeVal(max)}`;
        }
        case "is_null":
          return `[${column}] IS NULL`;
        case "is_not_null":
          return `[${column}] IS NOT NULL`;
        case "in":
          return `[${column}] IN (${value
            .split(",")
            .map(v => safeVal(v.trim()))
            .join(", ")})`;
        case "not_in":
          return `[${column}] NOT IN (${value
            .split(",")
            .map(v => safeVal(v.trim()))
            .join(", ")})`;
        default:
          return "";
      }
    })
    .filter(Boolean);

  return conditions.length ? "WHERE " + conditions.join(" AND ") : "";
};


  const handleApply = () => {
    const activeFilters = filters.filter((f) => f.enabled);
    if (!activeFilters.length) {
      alert("No active filters selected!");
      return;
    }

    let query;
    if (["mongo", "mongodb", "nosql"].includes(dbType?.toLowerCase())) {
      query = generateMongoQuery(activeFilters);
    } else {
      query = generateMSSQLQuery(activeFilters);
    }
    console.log("Generated Query:", query);
    setQuery(query)
    alert(`Generated Query:\n${JSON.stringify(query, null, 2)}`);
  };

  return (
    tableData?.columns && (
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex flex-col gap-2 overflow-auto h-full">
        {filters.map((filter, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* Checkbox to enable/disable filter */}
            <input
              type="checkbox"
              checked={filter.enabled}
              onChange={(e) =>
                handleChange(index, "enabled", e.target.checked)
              }
            />

            {/* Column Select */}
            <select
              className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1"
              value={filter.column}
              onChange={(e) => handleChange(index, "column", e.target.value)}
            >
              <option value="">Any column</option>
              {tableData?.columns?.map((column, key) => (
                <option key={key} value={column}>
                  {column}
                </option>
              ))}
            </select>

            {/* Operator Select */}
            <select
              className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1"
              value={filter.operator}
              onChange={(e) => handleChange(index, "operator", e.target.value)}
            >
              {filterOptions.map((option, key) => (
                <option key={key} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Value Input */}
            <input
              type="text"
              placeholder="Pattern"
              className="flex-1 bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-2 py-1"
              value={filter.value}
              onChange={(e) => handleChange(index, "value", e.target.value)}
            />

            {/* Remove Button */}
            <button
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded px-2 py-1"
              onClick={() => handleRemoveFilter(index)}
            >
              -
            </button>

            {/* Add Button */}
            <button
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded px-2 py-1"
              onClick={handleAddFilter}
            >
              +
            </button>
          </div>
        ))}

        {/* Apply Button */}
        <button
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded px-3 py-1 self-start"
          onClick={handleApply}
        >
          Apply Filters
        </button>
      </div>
    )
  );
}
