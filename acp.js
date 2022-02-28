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
 * 認識途中結果のコールバック関数です。
 * @callback ResultUpdatedCallback
 * @param {ResultUpdatedEvent} result 認識途中結果。
 */

/**
 * 認識途中結果イベント。
 * @see {@link https://acp.amivoice.com/main/manual/u-イベントパケット/}
 * @typedef {object} ResultUpdatedEvent
 * @property {Array<UpdatedResult>} results 認識途中結果情報の一覧。
 * @property {string} text 認識途中のすべての形態素の written を結合したテキスト。末尾には “…” が付く。
 */

/**
 * 認識途中結果情報。
 * @typedef {object} UpdatedResult
 * @property {Array<UpdatedToken>} tokens 認識途中の形態素の配列
 * @property {string} text 認識途中のすべての形態素の written を結合したテキスト。末尾には “…” が付く。
 */

/**
 * 認識途中の形態素。
 * @typedef {object} UpdatedToken
 * @property {string} written 形態素の表記。最後の形態素は、writtenが “…” のダミー形態素。
 */

/**
 * 認識結果のコールバック関数です。
 * @callback ResultFinalizedCallback
 * @param {ResultFinalizedEvent} result 認識結果。
 */

/**
 * 認識完了結果イベント。
 * @see {@link https://acp.amivoice.com/main/manual/a-イベントパケット/}
 * @typedef {object} ResultFinalizedEvent
 * @property {Array<FinalizedResult>} results 「発話区間の認識結果」の配列。
 * @property {string} text 「発話区間の認識結果」の全てを結合した全体の認識結果テキスト。
 * @property {string} code 結果を表す1文字のコード。
 * @property {string} message エラー内容を表す文字列。
 */

/**
 * 発話区間の認識結果。
 * @typedef {object} FinalizedResult
 * @property {number} confidence 信頼度(0～1の値。 0:信頼度低, 1:信頼度高) 。
 * @property {number} starttime 発話開始時間（音声データの先頭が0）。
 * @property {number} endtime 発話終了時間（音声データの先頭が0）。
 * @property {Array<object>} tags 未使用（空配列）。
 * @property {string} rulename 未使用（空文字）。
 * @property {string} text 認識結果テキスト。
 * @property {Array<FinalizedToken>} tokens 認識結果テキストの形態素の配列。
 */

/**
 * 認識結果テキストの形態素。
 * @typedef {object} FinalizedToken
 * @property {string} written 形態素（単語）の表記。
 * @property {number} confidence 形態素の信頼度（認識結果の尤度）。
 * @property {number} starttime 形態素の開始時間（音声データの先頭が0）。
 * @property {number} endtime 形態素の終了時間（音声データの先頭が0）。
 * @property {string} spoken 形態素の読み。
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
 * @param {ResultUpdatedCallback} resultUpdatedCallback 認識途中結果のコールバック。
 * @param {ResultFinalizedCallback} resultFinalizedCallback 認識結果のコールバック。
 * @returns {Promise<any>} 非同期処理の結果。戻り値はなし。
 */
function registerStreamTranscription(mediaRecorder, resultUpdatedCallback, resultFinalizedCallback) {
    return new Promise((resolve, reject) => {
        // 型チェックもしたいですが、裏で同機能の別クラスにしていることがあるのでチェックしていません。
        if (!mediaRecorder) {
            reject(new Error('Not found \'mediaRecorder\'.'));
        }

        if (!resultUpdatedCallback) {
            reject(new Error('Not found \'resultUpdatedCallback\'.'));
        }

        if (!resultFinalizedCallback) {
            reject(new Error('Not found \'resultFinalizedCallback\'.'));
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
            }
        });
        mediaRecorder.addEventListener('stop', () => {
            stopped = true;
        });

        Wrp.resultCreated = function() {
            console.debug('Wrp.resultCreated');
        };
        Wrp.resultUpdated = function(result) {
            const resultObject = JSON.parse(result);
            console.debug('Wrp.resultUpdated', resultObject);
            resultUpdatedCallback(resultObject);
        };
        Wrp.resultFinalized = function(result) {
            const resultObject = JSON.parse(result);
            console.debug('Wrp.resultFinalized:', resultObject);
            resultFinalizedCallback(resultObject);
        };
        Wrp.feedDataPauseEnded = function() {
            console.debug('Wrp.feedDataPauseEnded');
            Wrp.disconnect();
        };
        Wrp.disconnectEnded = function() {
            console.debug('Wrp.disconnectEnded');
            resolve();
        };
    });
}

// 外部に公開します。
export {
    connect,
    registerStreamTranscription
}