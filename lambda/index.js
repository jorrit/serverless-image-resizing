'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
});
const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;

function parseIntOrNull(input) {
  if (!input) {
    return null;
  }
  return parseInt(input, 10) || null;
}

exports.handler = function(event, context, callback) {
  let path = event.path; // Works with API Gateway Proxy requests
  if (path[0] === '/') {
    path = path.substr(1);
  }
  const key = decodeURI(path);

  const match = key.match(/(.*)-(\d*)x(\d*)(?:-(m))?\.(jpg|png)/i);
  if (match === null) {
    callback(null, {
      statusCode: '404',
      body: '404 - Not Found',
    });
    return;
  }

  const filePrefix = match[1];
  const width = parseIntOrNull(match[2]);
  const height = parseIntOrNull(match[3]);
  const type = match[4];
  const extension = match[5];
  const originalKey = filePrefix + '.' + extension;

  // Redirect to original when both dimensions are 0.
  if (!width && !height) {
    callback(null, {
      statusCode: '307',
      headers: {'location': `${URL}/${encodeURI(originalKey)}`},
      body: '',
    });
    return;
  }

  // Check if the resized image already exists.
  S3.headObject({Bucket: BUCKET, Key: key}).promise()
    .then(() => {
      callback(null, {
        statusCode: '307',
        headers: {'location': `${URL}/${path}`},
        body: '',
      });
    })
    .catch((err) => {
      // Bail if any error except object not found is returned.
      // err.code is NotFound for headObject and NoSuchKey for getObject.
      if (err.statusCode !== 404) {
        callback(`Error checking for existence of key ${key}`);
        return;
      }
      // Fetch the original object and resize it.
      S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
        .then(data => doResize(data, width, height, type)
            .then(buffer => ({ data, buffer })))
        .then(dataAndBuffer => S3.putObject({
            Body: dataAndBuffer.buffer,
            Bucket: BUCKET,
            ContentType: getTargetContentType(dataAndBuffer.data.ContentType),
            Key: key,
            CacheControl: dataAndBuffer.data.CacheControl,
            Expires: dataAndBuffer.data.Expires,
            Tagging: 'resized=true',
          }).promise()
        )
        .then(() => callback(null, {
            statusCode: '307',
            headers: {'location': `${URL}/${path}`},
            body: '',
          })
        )
        .catch(err => {
          // Gently return when error object not found is returned.
          if (err.statusCode === 404) {
            callback(null, {
              statusCode: '404',
              body: '404 - Not Found',
            });
            return;
          }
          callback(`Error getting original "${originalKey}" or saving resized image "${key}'": ${JSON.stringify(err, null, 2)}`);
        })
    });
}

function doResize(data, width, height, type) {
  let result = Sharp(data.Body)
    .rotate() // uses EXIF information.
    .resize(width, height);

  if (type === 'm' && width && height) {
    result = result.max();
  }

  return result.toFormat(getTargetFormat(data.ContentType)).toBuffer();
}

function getTargetFormat(contentType) {
  if (contentType === 'image/jpeg') {
    return 'jpeg';
  }
  return 'png';
}

function getTargetContentType(contentType) {
  if (contentType === 'image/jpeg') {
    return 'image/jpeg';
  }
  return 'image/png';
}
