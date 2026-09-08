// all_the_test.js Copyright 2020 Manchester Makerspace MIT License
const { runCacheTest } = require('../storage/on_site_cache_test.js');
const { createsMongoObjectIds } = require('../storage/mongo_test.js');
const {
  noValidDbTest,
  itUnderstandsBadStanding,
  itDisablesLeniencyByDefault,
  itUnderstandsGoodStanding,
} = require('../doorboto_test.js');

const runThemAll = async () => {
  try {
    itUnderstandsGoodStanding();
    itUnderstandsBadStanding();
    itDisablesLeniencyByDefault();
    createsMongoObjectIds();
    await runCacheTest();
    await noValidDbTest();
    process.exit(0);
  } catch (error) {
    console.log(`runThemAll => ${error}`);
    process.exitCode = 1;
  }
};

const runOne = async () => {
  try {
    itUnderstandsGoodStanding();
    itUnderstandsBadStanding();
    itDisablesLeniencyByDefault();
    // await runCacheTest();
    // await noValidDbTest();
    // process.exit(0);
  } catch (error) {
    console.log(`runOne => ${error}`);
    process.exitCode = 1;
  }
};

if (!module.parent) {
  // runOne();
  runThemAll();
}

module.exports = {
  runThemAll,
  runOne,
};
