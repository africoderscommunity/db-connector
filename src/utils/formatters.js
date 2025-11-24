export const isStructured = (val) => {
  if (val instanceof Date) return false;
  if (val === null || val === undefined) return false;
  if (typeof val === 'object') return true;

  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === 'object';
    } catch {
      return false;
    }
  }
  return false;
};

export const formatValue = (val) => {
  if (val === null || val === undefined) return 'NULL';
  if (val === '') return 'empty';
  if (val instanceof Date) return val.toISOString();
  
  if (typeof val === 'object' && val !== null) {
    if (val.$oid) return val.$oid;
    if (val.$date) {
      try {
        return new Date(val.$date).toISOString();
      } catch {
        return String(val.$date);
      }
    }
    if (Array.isArray(val)) return `[Array(${val.length})]`;
    return '{Object}';
  }
  
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return formatValue(parsed);
    } catch {
      return val;
    }
  }
  return String(val);
};

export const formatSqlValue = (val) => {
  if (val === null || val === undefined) return 'NULL';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
};

export const normalizeMongoValue = (value) => {
  if (value && typeof value === 'object') {
    if (value.$oid) return `ObjectId('${value.$oid}')`;
    if (value.$date) {
      const dateVal = typeof value.$date === 'object' && value.$date.$numberLong
        ? new Date(Number(value.$date.$numberLong)).toISOString()
        : new Date(value.$date).toISOString();
      return `ISODate('${dateVal}')`;
    }
  }
  return value;
};

 