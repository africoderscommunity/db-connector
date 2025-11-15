export const getDefaultPort = (type) => {
  const ports = {
    mysql: '3306',
    postgresql: '5432',
    mongodb: '27017',
    mssql: '1433',
  }
  return ports[type] || ''
}
