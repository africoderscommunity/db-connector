import { Client as PgClient } from 'pg'

export const connectPostgress = (config)=>{
    return  new PgClient({
              host: config.host,
              port: config.port,
              user: config.username,
              password: config.password,
              database: config.database,
              encrypt:true
            })
}