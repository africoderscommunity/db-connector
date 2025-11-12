import { MongoClient }from 'mongodb'

export const connectMongo = (mongoUrlLink)=>{
    return MongoClient.connect(
              `${mongoUrlLink}`
            );
}