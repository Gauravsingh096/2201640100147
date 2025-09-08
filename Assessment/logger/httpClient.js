const http = require('http');
const https = require('https');
const { URL } = require('url');

function chooseAgent(protocol) {
  return protocol === 'https:' ? https : http;
}

function postJSON(urlString, data, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const client = chooseAgent(url.protocol);

      const body = Buffer.from(JSON.stringify(data));
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length,
          ...extraHeaders
        },
      };

      const req = client.request(options, (res) => {
        let chunks = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            const parsed = chunks ? JSON.parse(chunks) : {};
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              const err = new Error('Request failed with status ' + res.statusCode);
              err.response = { status: res.statusCode, data: parsed };
              reject(err);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { postJSON };


