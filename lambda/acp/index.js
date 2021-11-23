const env = process.env;
const serviceId = env.SERVICE_ID;
const servicePassword = env.SERVICE_PASSWORD;
const url = `https://acp-api.amivoice.com/issue_service_authorization?sid=${serviceId}&spw=${servicePassword}`;
const https = require('https');

exports.handler = async (event) => {
    const promise = new Promise(function(resolve, reject) {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                resolve(data);
            });
        }).on('error', (e) => {
            reject(new Error(e));
        });
    });
    return promise;
};
