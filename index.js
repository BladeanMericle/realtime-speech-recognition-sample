/**
 * @file メインの処理です。
 */
'use strict';

const Common = require('./common');
const Amazon = require('./amazon');
const Frequency = require('./frequency');

/**
 * メッセージセクション。
 * @type {HTMLElement}
 */
let messageSection = null;

/**
 * メッセージ段落。
 * @type {HTMLElement}
 */
let messageParagraph = null;

/**
 * ログインセクション。
 * @type {HTMLElement}
 */
let loginSection = null;

/**
 * ログインユーザ名テキストボックス。
 * @type {HTMLInputElement}
 */
let loginUserNameInput = null;

/**
 * ログインパスワードテキストボックス。
 * @type {HTMLInputElement}
 */
let loginPasswordInput = null;

/**
 * ログインボタン。
 * @type {HTMLButtonElement}
 */
let loginButton = null;

/**
 * メインセクション。
 * @type {HTMLElement}
 */
let mainSection = null;

/**
 * 周波数スペクトルキャンバス。
 * @type {HTMLCanvasElement}
 */
let frequencyCanvas = null;

/**
 * 開始ボタン。
 * @type {HTMLButtonElement}
 */
let startButton = null;

/**
 * 停止ボタン。
 * @type {HTMLButtonElement}
 */
let stopButton = null;

/**
 * Amazon Transcribe の認識結果。
 * @type {HTMLButtonElement}
 */
let amazonTextarea = null;

/**
 * 音声メディアストリーム。
 * @type {MediaStream}
 */
let audioMediaStream = null;

/**
 * 音声コンテキスト。
 * @type {AudioContext}
 */
let audioContext = null;

/**
 * 周波数スペクトルの描画。
 * @type {Frequency.FrequencyPainter}
 */
let frequencyPainter = null;

/**
 * 音声レコーダー。
 * @type {MediaRecorder}
 */
let mediaRecorder = null;

/**
 * 要素を読み込みます。
 */
function loadElements() {
    messageSection = Common.getSectionElement('message-section');
    messageParagraph = Common.getParagraphElement('message-paragraph');
    loginSection = Common.getSectionElement('login-section');
    loginUserNameInput = Common.getInputElement('login-username-input');
    loginPasswordInput = Common.getInputElement('login-password-input');
    loginButton = Common.getButtonElement('login-button');
    Common.addClickEvent(loginButton, login);
    mainSection = Common.getSectionElement('main-section');
    frequencyCanvas = Common.getCanvasElement('frequency-canvas');
    startButton = Common.getButtonElement('start-button');
    Common.addClickEvent(startButton, start);
    stopButton = Common.getButtonElement('stop-button');
    Common.addClickEvent(stopButton, stop);
    amazonTextarea = Common.getTextareaElement('amazon-textarea');
}

/**
 * ログインページを表示します。
 */
function showLoginPage() {
    messageSection.style.display = 'none';
    mainSection.style.display = 'none';
    loginSection.style.display = 'block';
}

/**
 * メインページを表示します。
 */
function showMainPage() {
    console.debug('Show main page.');

    messageSection.style.display = 'none';
    loginSection.style.display = 'none';
    mainSection.style.display = 'block';

    // 実は判定が甘く二重にユーザーメディアを取得する可能性がありますが、十分実用に耐えると判断して放置しています。
    if (audioMediaStream) {
        return;
    }

    console.debug('Getting user media.');
    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
    .then((mediaStream) => {
        console.info('Succeeded to get user media.');
        audioMediaStream = mediaStream;
        audioContext = new AudioContext();
        frequencyPainter = new Frequency.FrequencyPainter(audioContext, audioMediaStream, frequencyCanvas, '#48D1CC');
        startButton.disabled = false;
    })
    .catch((error) => {
        console.error('Failed to get user media.', error);
        alert('マイクの準備ができませんでした。設定を確認し、ページを再読み込みしてみてください。');
    });
}

/**
 * メッセージページを表示します。
 * @param {string} message メッセージ。
 */
function showMessagePage(message) {
    defaultSection.style.display = 'none';
    loginSection.style.display = 'none';
    mainSection.style.display = 'none';
    if (message) {
        messageParagraph.innerText = message;
    }

    messageSection.style.display = 'block';
}

/**
 * ログインを実行します。
 * @this {HTMLElement}
 * @param {MouseEvent} ev マウスイベント
 */
function login(ev) {
    loginButton.disabled = true;
    Amazon.login(loginUserNameInput.value, loginPasswordInput.value)
    .then(() => {
        console.info('Succeeded to login.');
        showMainPage();
    })
    .catch((error) => {
        console.error('Failed to login.', error);
    })
    .finally(() => {
        loginButton.disabled = false;
    });
}

/**
 * 音声認識を開始します。
 * @this {HTMLElement}
 * @param {MouseEvent} ev マウスイベント
 */
function start(ev) {
    console.info('Start speech recognition.');
    if (frequencyPainter) {
        frequencyPainter.start();
    }

    amazonTextarea.textContent = '';

    if (mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder = null;
    }

    mediaRecorder = Common.createOpusMediaRecorder(audioMediaStream);
    if (!mediaRecorder) {
        alert('Webブラウザがaudio/ogg;codecs=opus形式をサポートしていないため、音声認識を開始できません。')
        return;
    }

    if (Amazon.isEnabledStreamTranscription()) {
        Amazon.registerStreamTranscription(mediaRecorder, 'ja-JP', 'ogg-opus', 48000, (transcript) => {
            console.debug('Received stream transcription.', transcript);
            if (!transcript.Results) {
                return;
            }

            transcript.Results.forEach((result) => {
                // 途中経過は表示しません。
                if (result.IsPartial) {
                    return;
                }

                if (!result.Alternatives)
                {
                    return;
                }

                result.Alternatives.forEach((alternative) => {
                    if (!alternative.Transcript) {
                        return;
                    }

                    amazonTextarea.textContent += result.StartTime + ' : ' + alternative.Transcript + '\n';
                });
            });
        })
        .then(() => {
            console.info('Finished stream transcription.');
            amazonTextarea.textContent += '[認識終了]\n';
        })
        .catch((error) => {
            console.error('Failed stream transcription.', error);
            amazonTextarea.textContent += '[認識エラー]\n';
        });
        amazonTextarea.textContent += '[認識開始]\n';
    }

    mediaRecorder.start(500);
    startButton.disabled = true;
    stopButton.disabled = false;
}

/**
 * 音声認識を停止します。
 * @this {HTMLElement}
 * @param {MouseEvent} ev マウスイベント
 */
function stop(ev) {
    console.info('Stop speech recognition.');
    if (frequencyPainter) {
        frequencyPainter.stop();
    }

    if (mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder = null;
    }

    stopButton.disabled = true;
    startButton.disabled = false;
}

Common.addLoadAction(() => {
    try {
        loadElements();
    } catch (error) {
        console.error('Failed to load elements.', error);
        alert('HTMLの構造に誤りがあります。');
        return;
    }

    Common.readJson('config.json')
    .then((json) => {
        console.info('Loaded config.', json);

        Amazon.setConfig(json); // Amazon の設定は必須

        // TODO 他のサービスの設定
        Amazon.checkLoginSession()
        .then((hasSession) => {
            if (hasSession) {
                console.info('Found login session.');
                showMainPage();
            } else {
                console.info('Not found login session.');
                showLoginPage();
            }
        })
        .catch((error) => {
            console.error('Failed to check login session.', error);
            showLoginPage();
        })
    })
    .catch((error) => {
        console.error('Failed to load.', error);
        showMessagePage('初期化に失敗しました。配置したファイルの内容や権限に誤りがないかご確認ください。');
    });
});
