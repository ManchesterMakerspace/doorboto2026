// on_site_cache.mjs Copyright 2020 Manchester Makerspace MIT Licence
// local cache logic for power, database, or network failure events
const storage = require('node-persist');
const logger = require('../logger.js');

const cacheSetup = async dir => {
  try {
    return await storage.init({ dir });
  } catch (error) {
    logger.error({ event: 'cache.setup.error', err: error }, 'Cache setup failed');
  }
};

// Takes a card object and sets it to local storage
const updateCard = async ({ holder, expiry, validity, uid }) => {
  expiry = Number(expiry);
  const card = {
    holder,
    expiry,
    validity,
  };
  try {
    const existingCard = await storage.getItem(uid);
    if (
      existingCard?.holder === card.holder &&
      existingCard?.expiry === card.expiry &&
      existingCard?.validity === card.validity
    ) {
      return false;
    }
    await storage.setItem(uid, card);
    return true;
  } catch (error) {
    logger.error({ event: 'cache.update.error', err: error, uid }, 'Cache update failed');
    return false;
  }
};

// returns a matching card if it exist
const checkForCard = async (uid) => {
  try {
    const cards = await storage.data();
    for (let info of cards) {
      const { key, value } = info;
      if (key === uid) {
        return {
          uid,
          ...value,
        };
      }
    }
    return null;
  } catch (error) {
    logger.error({ event: 'cache.read.error', err: error, uid }, 'Cache read failed');
  }
};

module.exports = { 
  cacheSetup,
  updateCard,
  checkForCard,
};
