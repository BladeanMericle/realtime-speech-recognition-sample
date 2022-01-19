const Path = require('path');

module.exports = {
    entry: Path.resolve(__dirname, 'index.js'),
    output: {
        path: Path.resolve(__dirname, 'release'),
        filename: 'index.js'
    },
    resolve: {
        fallback: {

        }
    }
};