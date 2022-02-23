const env = process.env;
const key = env.SUBSCRIPTION_KEY;
const endpoint = env.ENDPOINT;
const https = require('https');
const options = {
    method: 'POST',    
    headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': '0',  
    },
};

exports.handler = async (event) => {
    const promise = new Promise(function(resolve, reject) {
        const request = https.request(endpoint, options, (response) => {
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
        request.end();
    });
    return promise;
};
