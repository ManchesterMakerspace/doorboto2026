// database_sync.mjs Copyright 2020 Manchester Makerspace Licence MIT
const { MongoClient, ObjectId } = require('mongodb');
const logger = require('../logger.js');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const connectDB = async () => {
  const returnObj = {
    db: null,
    client: null,
  }
  if (!MONGODB_URI || !DB_NAME) {
    logger.info(
      { event: 'mongodb.disabled' },
      'MongoDB configuration is absent; using cache-only mode'
    );
    return returnObj;
  }
  const client = new MongoClient(MONGODB_URI);
  try { 
    await client.connect();
    returnObj.db = client.db(DB_NAME);
    returnObj.client = client;
    return returnObj;
  } catch (error) {
    logger.error({ event: 'mongodb.connect.error', err: error }, 'MongoDB connection failed');
    return returnObj;
  }
};

const insertDoc = doc => {
  return {
    ...doc,
    _id: new ObjectId(),
  };
};

// Hold db and closeDb in closure to use after standing check
const makeRecordOfScanFunc = (db, client) => {
  return async ({ authorized, cardData }) => {
    const collection = authorized ? 'checkins' : 'rejections';
    const data = authorized
      ? {
        name: cardData.holder,
        time: new Date().getTime(),
      }
      : {
        ...cardData,
        timeOf: new Date(),
      };
    await db.collection(collection).insertOne(insertDoc(data));
    client.close();
  }
}

// takes a card and returns an insert function
const getCardFromDb = async uid => {
  const {db, client} = await connectDB();
  // default to unregistered card
  const result = {
    dbCardData: null,
    recordScan: async () => {},
  }
  if(!db){
    return result;
  }
  result.dbCardData = await db.collection('cards').findOne({ uid });
  result.recordScan = makeRecordOfScanFunc(db, client);
  return result;
}

module.exports = { 
  connectDB,
  insertDoc,
  getCardFromDb,
  makeRecordOfScanFunc,
};
