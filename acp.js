/**
 * @file ACPに関する処理です。
 */
'use strict';

/**
 * ACPの設定です。
 * @typedef {object} AcpConfig
 * @property {string} ServerURL 音声認識サーバのURL。
 * @property {string} EngineName 接続エンジン名。
 * @property {string} AudioFormat 音声フォーマット。
 * @property {string} AppKey AppKey。
 */

/**
 * 認識結果のコールバック関数です。
 * @callback AcpEventCallback
 * @param {object} result 認識結果。
 */

/**
 * 音声認識サービスへ接続します。
 * @param {AcpConfig} config ACPの設定
 * @returns {Promise<any>} 非同期処理の結果。戻り値はなし。
 */
function connect(config) {
    return new Promise((resolve, reject) => {
        if (!config) {
            reject(new Error('Not found ACP\'s config.'));
        }

        if (!Wrp) {
            reject(new Error('Not found Wrp object.'));
        }

        // ACP の設定
        Wrp.serverURL = config.ServerURL ?? 'wss://acp-api.amivoice.com/v1/';
        Wrp.grammarFileNames = config.EngineName ?? '-a-general';
        Wrp.codec = config.AudioFormat ?? '16k';
        Wrp.authorization = config.AppKey;

        Wrp.connectStarted = function() {
            console.debug('Wrp.connectStarted');
        };
        Wrp.connectEnded = function() {
            console.debug('Wrp.connectEnded');
            if (!Wrp.feedDataResume()) {
                reject(new Error('Failed to feed data resume.'));
            }

            // ログを出力するだけに戻します。
            Wrp.connectEnded = function() {
                console.debug('Wrp.connectEnded');
            };
        };
        Wrp.disconnectStarted = function() {
            console.debug('Wrp.disconnectStarted');
        };
        Wrp.disconnectEnded = function() {
            console.debug('Wrp.disconnectEnded');
        };
        Wrp.feedDataResumeStarted = function() {
            console.debug('Wrp.feedDataResumeStarted');
        };
        Wrp.feedDataResumeEnded = function() {
            console.debug('Wrp.feedDataResumeEnded');
            resolve();

            // ログを出力するだけに戻します。
            Wrp.feedDataResumeEnded = function() {
                console.debug('Wrp.feedDataResumeEnded');
            };
        };
        Wrp.feedDataPauseStarted = function() {
            console.debug('Wrp.feedDataPauseStarted');
        };
        Wrp.feedDataPauseEnded = function() {
            console.debug('Wrp.feedDataPauseEnded');
        };
        Wrp.utteranceStarted = function() {
            console.debug('Wrp.utteranceStarted');
        };
        Wrp.utteranceEnded = function() {
            console.debug('Wrp.utteranceEnded');
        };
        Wrp.TRACE = function(message) {
            console.debug(`Wrp.TRACE: ${message}`);
        };

        if (!Wrp.connect()) {
            reject(new Error('Failed to connect ACP.'));
        }
    });
}

/**
 * 音声認識ストリーミングを登録します。
 * @param {MediaRecorder} mediaRecorder 音声レコーダー。
 * @param {AcpEventCallback} acpEventCallback 認識結果のコールバック。
 * @returns {Promise<any>} 非同期処理の結果。戻り値はなし。
 */
function registerStreamTranscription(mediaRecorder, acpEventCallback) {
    return new Promise((resolve, reject) => {
        // 型チェックもしたいですが、裏で同機能の別クラスにしていることがあるのでチェックしていません。
        if (!mediaRecorder) {
            reject(new Error('Not found \'mediaRecorder\'.'));
        }

        if (!acpEventCallback) {
            reject(new Error('Not found \'acpEventCallback\'.'));
        }

        if (!Wrp) {
            throw new Error('Not found Wrp object.');
        }

        let stopped = false;
        mediaRecorder.addEventListener('dataavailable', async (e) => {
            /** @type {Blob} */
            const data = e.data;
            const dataArray = new Uint8Array(await data.arrayBuffer());
            Wrp.feedData(dataArray, 0, dataArray.length);
            if (stopped) {
                Wrp.feedDataPause();
                Wrp.disconnect();
            }
        });
        mediaRecorder.addEventListener('stop', () => {
            resolve();
            stopped = true;
        });

        Wrp.resultCreated = function() {
            console.debug('Wrp.resultCreated');
        };
        Wrp.resultUpdated = function(result) {
            const resultObject = JSON.parse(result);
            console.debug('Wrp.resultUpdated', resultObject);
        };
        Wrp.resultFinalized = function(result) {
            const resultObject = JSON.parse(result);
            console.debug('Wrp.resultFinalized:', resultObject);
            acpEventCallback(resultObject);
        };
    });
}

// 外部に公開します。
export {
    connect,
    registerStreamTranscription
}