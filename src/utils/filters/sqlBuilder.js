
export const generateMSSQLQuery = (filters) => {
  const conditions = filters
    .map(({ column, operator, value }) => {
      if (!column) return ""

      const safe = (v) => `'${v.replace(/'/g, "''")}'`

      switch (operator) {
        case "equals": return `[${column}] = ${safe(value)}`
        case "not_equals": return `[${column}] != ${safe(value)}`
        case "contains": return `[${column}] LIKE '%${value}%'`
        case "not_contains": return `[${column}] NOT LIKE '%${value}%'`
        case "starts_with":
        case "has_prefix":
          return `[${column}] LIKE '${value}%'`

        case "ends_with":
        case "has_suffix":
          return `[${column}] LIKE '%${value}'`

        case "greater_than": return `[${column}] > ${safe(value)}`
        case "less_than": return `[${column}] < ${safe(value)}`
        case "greater_or_equal": return `[${column}] >= ${safe(value)}`
        case "less_or_equal": return `[${column}] <= ${safe(value)}`

        case "between": {
          const [a, b] = value.split(",").map(v => v.trim())
          return `[${column}] BETWEEN ${safe(a)} AND ${safe(b)}`
        }

        case "not_between": {
          const [a, b] = value.split(",").map(v => v.trim())
          return `[${column}] NOT BETWEEN ${safe(a)} AND ${safe(b)}`
        }

        case "is_null": return `[${column}] IS NULL`
        case "is_not_null": return `[${column}] IS NOT NULL`

        case "in":
          return `[${column}] IN (${value
            .split(",")
            .map(v => safe(v.trim()))
            .join(", ")})`

        case "not_in":
          return `[${column}] NOT IN (${value
            .split(",")
            .map(v => safe(v.trim()))
            .join(", ")})`

        default:
          return ""
      }
    })
    .filter(Boolean)

  return conditions.length ? "WHERE " + conditions.join(" AND ") : ""
}
