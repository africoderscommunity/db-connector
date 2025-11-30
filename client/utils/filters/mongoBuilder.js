
export const generateMongoQuery = (filters) => {
  const query = {}

  for (const f of filters) {
    const { column, operator, value } = f
    if (!column) continue

    switch (operator) {
      case "equals":
        query[column] = value
        break

      case "not_equals":
        query[column] = { $ne: value }
        break

      case "contains":
        query[column] = { $regex: value, $options: "i" }
        break

      case "not_contains":
        query[column] = { $not: { $regex: value, $options: "i" } }
        break

      case "starts_with":
      case "has_prefix":
        query[column] = { $regex: `^${value}`, $options: "i" }
        break

      case "ends_with":
      case "has_suffix":
        query[column] = { $regex: `${value}$`, $options: "i" }
        break

      case "greater_than":
        query[column] = { $gt: value }
        break

      case "less_than":
        query[column] = { $lt: value }
        break

      case "greater_or_equal":
        query[column] = { $gte: value }
        break

      case "less_or_equal":
        query[column] = { $lte: value }
        break

      case "between": {
        const [min, max] = value.split(",").map((v) => v.trim())
        query[column] = { $gte: min, $lte: max }
        break
      }

      case "not_between": {
        const [min, max] = value.split(",").map((v) => v.trim())
        query[column] = { $not: { $gte: min, $lte: max } }
        break
      }

      case "is_null":
        query[column] = { $eq: null }
        break

      case "is_not_null":
        query[column] = { $ne: null }
        break

      case "in":
        query[column] = { $in: value.split(",").map((v) => v.trim()) }
        break

      case "not_in":
        query[column] = { $nin: value.split(",").map((v) => v.trim()) }
        break
    }
  }

  return query
}
