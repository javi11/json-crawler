const { isObject } = require('lodash');
const cloudscraper = require('cloudscraper');
const request = require('request-promise');
const { promisify } = require('bluebird');
const { isValidMethod, scrappe } = require('./helpers');

function createDinamicMethods(json, scope) {
  Object.keys(json).forEach(methodName => {
    const method = json[methodName];
    const error = isValidMethod(method, methodName);

    if (error) {
      throw error;
    }

    return Object.assign(scope, {
      [methodName]: () =>
        scope
          .httpProvider({
            url: method.url,
            method: method.httpMethod
          })
          .then(body => Promise.resolve(scrappe(body, method)))
    });
  });
}

exports.JsonCrawler = class JsonCrawler {
  constructor(json, { cloudFlareByPass } = {}) {
    if (!isObject(json)) {
      throw new Error('Incorrect json format');
    }

    if (cloudFlareByPass === true) {
      this.httpProvider = promisify(cloudscraper.request);
    } else {
      this.httpProvider = request;
    }

    createDinamicMethods(json, this);
  }
};
