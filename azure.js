/**
 * @file Azureに関する処理です。
 */
'use strict';

const SpeechSdk = require('microsoft-cognitiveservices-speech-sdk')

/**
 * Azureの設定です。
 * @typedef {object} AzureConfig
 * @property {string} AuthorizationToken 認証トークン。
 * @property {string} Region リージョン。
 * @property {string} Language 言語。
 */

/**
 * 認識フレーズ毎の認識開始のコールバック関数です。
 * @callback AzureSpeechRecognitionStartEventCallback
 */

/**
 * 認識結果のコールバック関数です。
 * @callback AzureSpeechRecognitionEventCallback
 * @param {SpeechSdk.SpeechRecognitionResult} result 認識結果。
 */

/**
 * 認識エラーのコールバック関数です。
 * @callback AzureSpeechRecognitionErrorEventCallback
 * @param {Error} error エラー。
 */

/**
 * 認識終了のコールバック関数です。
 * @callback AzureSpeechRecognitionEndEventCallback
 */

/**
 * 音声認識。
 * @type {SpeechSdk.SpeechRecognizer}
 */
let speechRecognizer;

/**
 * 認識終了のコールバック。
 * @type {AzureSpeechRecognitionEndEventCallback}
 */
let speechRecognitionEndCallback;

/**
 * 音声認識を初期化します。
 * @param {AzureConfig} config Azureの設定。
 */
function initializeSpeechRecognition(config) {
    stopSpeechRecognition();

    const speechConfig = SpeechSdk.SpeechConfig.fromAuthorizationToken(config.AuthorizationToken, config.Region ?? 'japaneast');
    speechConfig.speechRecognitionLanguage = config.Language ?? 'ja-JP';
    const audioConfig = SpeechSdk.AudioConfig.fromDefaultMicrophoneInput();
    speechRecognizer = new SpeechSdk.SpeechRecognizer(speechConfig, audioConfig);
}

/**
 * 音声認識を開始します。
 * @param {AzureSpeechRecognitionStartEventCallback} startCallback 認識フレーズ毎の認識開始のコールバック。
 * @param {AzureSpeechRecognitionEventCallback} resultCallback 認識結果のコールバック。
 * @param {AzureSpeechRecognitionErrorEventCallback} errorCallback 認識エラーのコールバック。
 * @param {AzureSpeechRecognitionEndEventCallback} endCallback 認識終了のコールバック。
 */
function startSpeechRecognition(startCallback, resultCallback, errorCallback, endCallback) {
    speechRecognitionEndCallback = endCallback;
    continueSpeechRecognition(startCallback, resultCallback, errorCallback);
}

/**
 * 音声認識を継続します。
 * @param {AzureSpeechRecognitionStartEventCallback} startCallback 認識フレーズ毎の認識開始のコールバック。
 * @param {AzureSpeechRecognitionEventCallback} resultCallback 認識結果のコールバック。
 * @param {AzureSpeechRecognitionErrorEventCallback} errorCallback 認識エラーのコールバック。
 */
function continueSpeechRecognition(startCallback, resultCallback, errorCallback) {
    if (!speechRecognizer) {
        return;
    }

    startCallback();
    speechRecognizer.recognizeOnceAsync(
        (result) => {
            if (!speechRecognizer) {
                return;
            }

            if (result.reason === SpeechSdk.ResultReason.RecognizedSpeech) {
                resultCallback(result);
            }

            continueSpeechRecognition(startCallback, resultCallback, errorCallback);
        },
        (error) => {
            errorCallback(new Error(`Failed to recognize in Azure Speech SDK. : ${error}`));
        });
}

/**
 * 音声認識を停止します。
 */
function stopSpeechRecognition() {
    if (!speechRecognizer) {
        return;
    }

    if (speechRecognitionEndCallback) {
        speechRecognitionEndCallback();
        speechRecognitionEndCallback = null;
    }

    speechRecognizer.close();
    speechRecognizer = null;
}

// 外部に公開します。
export {
    initializeSpeechRecognition,
    startSpeechRecognition,
    stopSpeechRecognition,
}