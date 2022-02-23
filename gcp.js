/**
 * @file GCPに関する処理のはずでしたが、ブラウザから直接呼び出す手段がないのでGoogle Chrome上でWeb Speech APIを呼び出す手法に切り替わっています。
 */
'use strict';

/**
 * 認識結果のコールバック関数です。
 * @callback SpeechRecognitionEventCallback
 * @param {SpeechRecognitionEvent} result 認識結果。
 */

/**
 * 認識エラーのコールバック関数です。
 * @callback SpeechRecognitionErrorEventCallback
 * @param {SpeechRecognitionErrorEvent} result 認識結果。
 */

/**
 * 認識終了のコールバック関数です。
 * @callback SpeechRecognitionEndEventCallback
 * @param {Event} result イベント。
 */

/**
 * 音声認識クライアント。
 * @type {SpeechRecognition}
 */
let speechRecognition;

/**
 * 音声認識が有効かどうかを取得します。
 * @returns {boolean} 音声認識が有効かどうかを取得します。
 */
function isEnabledSpeechRecognition() {
    return window.webkitSpeechRecognition || window.SpeechRecognition;
}

/**
 * 音声認識を初期化します。
 */
function initializeSpeechRecognition() {
    if (speechRecognition) {
        speechRecognition.stop();
        speechRecognition = null;
    }

    window.SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    speechRecognition = new window.SpeechRecognition();
    speechRecognition.lang = 'ja-JP';
    speechRecognition.interimResults = true;
    speechRecognition.continuous = true;
}

/**
 * 音声認識を開始します。
 * @param {SpeechRecognitionEventCallback} resultCallback 認識結果のコールバック。
 * @param {SpeechRecognitionErrorEventCallback} errorCallback 認識エラーのコールバック。
 * @param {SpeechRecognitionEndEventCallback} endCallback 認識終了のコールバック。
 */
function startSpeechRecognition(resultCallback, errorCallback, endCallback) {
    if (!speechRecognition) {
        return;
    }

    speechRecognition.onresult = resultCallback;
    speechRecognition.onerror = errorCallback;
    speechRecognition.onend = endCallback;
    speechRecognition.start();
}

/**
 * 音声認識を停止します。
 */
function stopSpeechRecognition() {
    if (!speechRecognition) {
        return;
    }

    speechRecognition.stop();
}


// 外部に公開します。
export {
    isEnabledSpeechRecognition,
    initializeSpeechRecognition,
    startSpeechRecognition,
    stopSpeechRecognition
}