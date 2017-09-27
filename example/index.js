const { JsonCrawler } = require('../lib/index');
const testJson = require('./test.json');

const crawler = new JsonCrawler(testJson);

crawler
  .catalog()
  .then(data => console.log(data))
  .error(err => console.log(err));
