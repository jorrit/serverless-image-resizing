'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;

exports.handler = function(event, context) {
  let key = event.path; // Works with API Gateway Proxy requests
  if (key[0] === '/') {
    key = key.substr(1);
  }

  const match = key.match(/(.*)-(\d+)x(\d+)\.(jpg|png)/i);
  if (match === null) {
    context.succeed({
      statusCode: '404',
      body: '404 - Not Found',
    });
    return;
  }

  const filePrefix = match[1];
  const width = parseInt(match[2], 10);
  const height = parseInt(match[3], 10);
  const extension = match[4];
  const originalKey = filePrefix + '.' + extension;

  // Check if the resized image already exists.
  S3.getObject({Bucket: BUCKET, Key: key}).promise()
    .then((data) => {
      context.succeed({
        statusCode: '307',
        headers: {'location': `${URL}/${key}`},
        body: '',
      });
    })
    .catch((err) => {
      // Bail if any error except object not found is returned.
      if (err.code !== 'NoSuchKey') {
        context.fail(err);
        return;
      }
      // Fetch the original object and resize it.
      S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
        .then(data => Sharp(data.Body)
          .rotate() // uses EXIF information.
          .resize(width, height)
          .toFormat(getTargetFormat(data.ContentType))
          .toBuffer().then(buffer => ({ data, buffer })))
        .then(dataAndBuffer => S3.putObject({
            Body: dataAndBuffer.buffer,
            Bucket: BUCKET,
            ContentType: getTargetContentType(dataAndBuffer.data.ContentType),
            Key: key,
            CacheControl: dataAndBuffer.data.CacheControl,
            Expires: dataAndBuffer.data.Expires
          }).promise()
        )
        .then(() => context.succeed({
            statusCode: '307',
            headers: {'location': `${URL}/${key}`},
            body: '',
          })
        )
        .catch((err) => context.fail(err))
    });
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
