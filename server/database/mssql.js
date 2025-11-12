import mssql from 'mssql'

export const connectMssql = (config)=>{
    return mssql.connect({
              server: config.host,
              port: parseInt(config.port),
              user: config.username,
              password: config.password,
              database: config.database,
              options: {
                encrypt: true,
                trustServerCertificate: true
              }
            })
}