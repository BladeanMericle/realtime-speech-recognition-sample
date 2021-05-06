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
 * 周波数スペクトル表示の開始ボタン。
 * @type {HTMLButtonElement}
 */
let frequencyStartButton = null;

/**
 * 周波数スペクトル表示の停止ボタン。
 * @type {HTMLButtonElement}
 */
let frequencyStopButton = null;

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
    frequencyStartButton = Common.getButtonElement('frequency-start-button');
    Common.addClickEvent(frequencyStartButton, startFrequencyDisplay);
    frequencyStopButton = Common.getButtonElement('frequency-stop-button');
    Common.addClickEvent(frequencyStopButton, stopFrequencyDisplay);
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

    if (audioMediaStream) {
        return;
    }

    console.debug('Getting user media.');
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then((mediaStream) => {
        console.info('Succeeded to get user media.');
        audioMediaStream = mediaStream;
        audioContext = new AudioContext();
        frequencyPainter = new Frequency.FrequencyPainter(audioContext, audioMediaStream, frequencyCanvas, '#48D1CC');
        frequencyStartButton.disabled = false;
    })
    .catch((error) => {
        console.error('Failed to get user media.', error);
        alert('マイクの準備ができませんでした。設定を確認し、ページを再読み込みしてください。');
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
 * 周波数スペクトルの表示を開始します。
 * @this {HTMLElement}
 * @param {MouseEvent} ev マウスイベント
 */
function startFrequencyDisplay(ev) {
    if (!frequencyPainter) {
        return;
    }

    console.info('Start frequency display.');
    frequencyStartButton.disabled = true;
    frequencyPainter.start();
    frequencyStopButton.disabled = false;
}

/**
 * 周波数スペクトルの表示を停止します。
 * @this {HTMLElement}
 * @param {MouseEvent} ev マウスイベント
 */
function stopFrequencyDisplay(ev) {
    if (!frequencyPainter) {
        return;
    }

    console.info('Stop frequency display.');
    frequencyStopButton.disabled = true;
    frequencyPainter.stop();
    frequencyStartButton.disabled = false;
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

        const amazonConfig = json['Amazon'];
        Amazon.setConfig(amazonConfig); // Amazon の設定は必須

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
