import { createConnection }from 'mysql2/promise'


export const connectMysql = (config)=>{
    return  createConnection({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          database: config.database,
          encrypt:true
          
        });
}