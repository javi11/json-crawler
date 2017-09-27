const jquery = require('jquery');
const { template, isObject } = require('lodash');
const jsdom = require('jsdom');
const logger = require('./logger');

const dom = new jsdom.JSDOM(`<!DOCTYPE html>`);
const load = jquery(dom.window);
const validHttpMethods = ['get'];

function isRegex(findTag) {
  return findTag.indexOf('regex:') > -1;
}

function getResource(item, extract) {
  let value;

  const extractAtributtes = extract.split('||');
  for (let i = 0; i < extractAtributtes.length; i += 1) {
    value = extractAtributtes[i] === 'html' ? item.html() : item.attr(extractAtributtes[i]);
    if (value) {
      break;
    }
  }
  return value;
}

function scrappe(html, find, allHtml = html) {
  if (!html) {
    logger.error('Html is empty on', find);
    return [];
  }
  const data = load(html);

  let startHtml;
  const result = [];
  const { transform, root } = find;

  if (root) {
    startHtml = data;
  } else {
    startHtml = data.find(find.startTag);
  }

  if (!startHtml) {
    logger.info(`scrapper--> ${find.startTag} not found on the html`);
    return [];
  }

  const { scrapper } = find;
  startHtml.each((index, item) => {
    const $item = root ? data : load(item);
    const element = {};

    Object.keys(scrapper).forEach(key => {
      if (typeof scrapper[key] === 'object') {
        element[key] = scrappe(item, scrapper[key], allHtml);
      } else if (isRegex(scrapper[key])) {
        const regex = new RegExp(scrapper[key].split('regex:')[1]);
        const matches = regex.exec(allHtml);
        element[key] = matches.length > 0 && matches[1];
      } else {
        const [findTag, extract] = scrapper[key].split('@');
        if (!extract) {
          logger.info('scrapper--> No tag @ found on ', key);
        } else {
          element[key] = getResource(findTag ? $item.find(findTag) : $item, extract);
        }
      }
    });
    result.push(element);
  });

  if (transform) {
    Object.keys(transform).forEach(transformation => {
      result.forEach((item, $index) => {
        try {
          const compiled = template(transform[transformation]);
          Object.assign(item, { [transformation]: compiled(item) });
          result[$index] = item;
        } catch (err) {
          logger.info('scrapper--> Error on transformation, ', transformation, err);
        }
      });
    });
  }
  return result;
}

function isValidUrl(str) {
  const regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
  if (!str || !regex.test(str)) {
    return false;
  }
  return true;
}

function isValidHttpMethod(method) {
  if (!method || validHttpMethods.indexOf(method.toLowerCase()) === -1) {
    return false;
  }

  return true;
}

function isValidMethod(method, methodName) {
  let error;
  if (!isValidUrl(method.url)) {
    error = new Error(`Invalid url at method ${methodName}`);
  }

  if (!isValidHttpMethod(method.httpMethod)) {
    error = new Error(
      `Invalid http method at method ${methodName}. Valid methods ${validHttpMethods.join(',')}`
    );
  }

  if (!isObject(method.scrapper)) {
    error = new Error(`'scrapper' propertie must be present on ${methodName}`);
  }

  if (method.transform && !isObject(method.transform)) {
    error = new Error(`'transform' propertie is not valid on ${methodName}`);
  }

  return error;
}

module.exports = { scrappe, getResource, isRegex, isValidMethod, isValidUrl };
