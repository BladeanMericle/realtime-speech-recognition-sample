/**
 * @file メインの処理です。
 */
'use strict';

const Common = require('./common');
const Aws = require('./aws');
const Gcp = require('./gcp');
const Azure = require('./azure');
const Acp = require('./acp');
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
 * Amazon Transcribeセクション。
 * @type {HTMLElement}
 */
let awsSection = null;

/**
 * Amazon Transcribeの認識結果。
 * @type {HTMLTextAreaElement}
 */
let awsTextarea = null;

/**
 * GCP Speech To Textセクション。
 * @type {HTMLElement}
 */
let gcpSection = null;

/**
 * GCP Speech To Textの認識結果。
 * @type {HTMLTextAreaElement}
 */
let gcpTextarea = null;

/**
 * Azure Speech To Textセクション。
 * @type {HTMLElement}
 */
let azureSection = null;

/**
 * Azure Speech To Textの認識結果。
 * @type {HTMLTextAreaElement}
 */
let azureTextarea = null;

/**
 * ACPセクション。
 * @type {HTMLElement}
 */
let acpSection = null;

/**
 * ACPの認識結果。
 * @type {HTMLTextAreaElement}
 */
let acpTextarea = null;

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
 * Azureの認証トークンを取得する関数の名前。
 * @type {string}
 */
let azureFunctionName = null;

/**
 * ACPの認証トークンを取得する関数の名前。
 * @type {string}
 */
let acpFunctionName = null;

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
    awsSection = Common.getSectionElement('aws-section');
    awsTextarea = Common.getTextareaElement('aws-textarea');
    gcpSection = Common.getSectionElement('gcp-section');
    gcpTextarea = Common.getTextareaElement('gcp-textarea');
    azureSection = Common.getSectionElement('azure-section');
    azureTextarea = Common.getTextareaElement('azure-textarea');
    acpSection = Common.getSectionElement('acp-section');
    acpTextarea = Common.getTextareaElement('acp-textarea');
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
    Aws.login(loginUserNameInput.value, loginPasswordInput.value)
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

    if (mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder = null;
    }

    mediaRecorder = Common.createOggOpusMediaRecorder(audioMediaStream);

    awsTextarea.textContent = '';
    gcpTextarea.textContent = '';
    azureTextarea.textContent = '';
    acpTextarea.textContent = '';
    startButton.disabled = true;
    stopButton.disabled = false;

    Promise.all([
        connectGcp(),
        connectAzure(),
        connectAcp()
    ])
    .then(() => {
        startAwsRecognition();
        startGcpRecognition();
        startAzureRecognition();
        startAcpRecognition();

        if (frequencyPainter) {
            frequencyPainter.start();
        }

        if (mediaRecorder) {
            mediaRecorder.start(500);
        }
    })
    .catch((error) => {
        console.error('Failed to get access token.', error);
    });
}

/**
 * Amazon Transcribeの音声認識を開始します。
 */
function startAwsRecognition() {
    if (!mediaRecorder) {
        return;
    }

    if (!Aws.isEnabledStreamTranscription()) {
        return;
    }

    let partialTextLength = 0;
    Aws.registerStreamTranscription(mediaRecorder, 'ja-JP', 'ogg-opus', 48000, (transcript) => {
        console.debug('Received stream transcription.', transcript);
        if (!transcript.Results) {
            return;
        }

        transcript.Results.forEach((result) => {
            if (!result.Alternatives)
            {
                return;
            }

            result.Alternatives.forEach((alternative) => {
                if (!alternative.Transcript) {
                    return;
                }

                if (result.IsPartial) {
                    const partialText = `認識中 : ${alternative.Transcript}`;
                    if (partialTextLength != 0) {
                        awsTextarea.textContent = awsTextarea.textContent.slice(0, -partialTextLength);
                    }

                    partialTextLength = partialText.length;
                    awsTextarea.textContent += partialText;
                } else {
                    const fixedText = `${toSecondsString(result.StartTime * 1000)} : ${alternative.Transcript}\n`;
                    if (partialTextLength != 0) {
                        awsTextarea.textContent = awsTextarea.textContent.slice(0, -partialTextLength);
                    }

                    partialTextLength = 0;
                    awsTextarea.textContent += fixedText;
                }
            });
        });
    })
    .then(() => {
        console.info('Finished AWS stream transcription.');

        if (partialTextLength > 0) {
            awsTextarea.textContent += '\n';
        }

        awsTextarea.textContent += '[認識終了]\n';
    })
    .catch((error) => {
        console.error('Failed AWS stream transcription.', error);
        awsTextarea.textContent += '[認識エラー]\n';
    });
    awsTextarea.textContent += '[認識開始]\n';
}

/**
 * GCP Speech To Textの音声認識サービスに接続します。
 */
async function connectGcp() {
    if (!Gcp.isEnabledSpeechRecognition()) {
        return;
    }

    Gcp.initializeSpeechRecognition();
}

/**
 * GCP Speech To Textの音声認識を開始します。
 */
function startGcpRecognition() {
    if (!Gcp.isEnabledSpeechRecognition()) {
        return;
    }

    gcpTextarea.textContent += '[認識開始]\n';
    const initialTime = new Date();
    let startTime = new Date();
    let isFirst = true;
    let partialTextLength = 0;
    Gcp.startSpeechRecognition(
        (event) => {
            if (!event) {
                return;
            }

            console.debug('Received GCP Speech To Text result.', event);
            const result = event.results[event.resultIndex];
            if (!result.isFinal) {
                startTime = isFirst ? new Date() : startTime; // 最初のタイムスタンプのみ採用する
                const partialText = `認識中 : ${result[0].transcript}`;
                if (partialTextLength != 0) {
                    gcpTextarea.textContent = gcpTextarea.textContent.slice(0, -partialTextLength);
                }

                partialTextLength = partialText.length;
                gcpTextarea.textContent += partialText;
                isFirst = false;
            } else {
                const fixedText = `${toSecondsString(startTime - initialTime)} : ${result[0].transcript}\n`;
                if (partialTextLength != 0) {
                    gcpTextarea.textContent = gcpTextarea.textContent.slice(0, -partialTextLength);
                }

                partialTextLength = 0;
                gcpTextarea.textContent += fixedText;
                isFirst = true;
            }
        },
        (error) => {
            console.error('Failed GCP Speech To Text.', error);
            gcpTextarea.textContent += '[認識エラー]\n';
        },
        () => {
            console.info('Finished GCP Speech To Text.');

            if (partialTextLength > 0) {
                gcpTextarea.textContent += '\n';
            }

            gcpTextarea.textContent += '[認識終了]\n';
        });
}

/**
 * Azure Speech To Textの音声認識サービスに接続します。
 */
async function connectAzure() {
    if (!mediaRecorder) {
        return;
    }

    if (!azureFunctionName) {
        return;
    }

    const authorizationToken = await Aws.callLambdaFunction(azureFunctionName, { });
    Azure.initializeSpeechRecognition({ AuthorizationToken: authorizationToken });
}

/**
 * Azure Speech To Textの音声認識を開始します。
 */
function startAzureRecognition() {
    if (!mediaRecorder) {
        return;
    }

    if (!azureFunctionName) {
        return;
    }

    azureTextarea.textContent += '[認識開始]\n';
    const initialTime = new Date();
    let startTime = new Date();
    Azure.startSpeechRecognition(
        () => {
            console.debug('Start Azure Speech Service once.');
            startTime = new Date();
        },
        (result) => {
            console.debug('Received Azure Speech Service result.', result);
            const recognitionStartTime = (startTime - initialTime) + (result.offset / 10000);
            azureTextarea.textContent += `${toSecondsString(recognitionStartTime)} : ${result.text}\n`;
        },
        (error) => {
            console.error('Failed Azure Speech Service.', error);
            azureTextarea.textContent += '[認識エラー]\n';
        },
        () => {
            console.info('Finished Azure Speech Service.');
            azureTextarea.textContent += '[認識終了]\n';
        });
}

/**
 * ACPの音声認識サービスに接続します。
 */
async function connectAcp() {
    if (!mediaRecorder) {
        return;
    }

    if (!acpFunctionName) {
        return;
    }

    const appKey = await Aws.callLambdaFunction(acpFunctionName, { });
    await Acp.connect({ AppKey: appKey });
}

/**
 * ACPの音声認識を開始します。
 */
function startAcpRecognition() {
    if (!mediaRecorder) {
        return;
    }

    if (!acpFunctionName) {
        return;
    }

    let isCompleted = false;
    let updatedTextLength = 0;
    Acp.registerStreamTranscription(
        mediaRecorder,
        (result) => {
            if (!result || !result.text || isCompleted) {
                return;
            }

            const updatedText = `認識中 : ${result.text}`;
            if (updatedTextLength != 0) {
                acpTextarea.textContent = acpTextarea.textContent.slice(0, -updatedTextLength);
            }

            updatedTextLength = updatedText.length;
            acpTextarea.textContent += updatedText;
        },
        (result) => {
            if (!result || !result.text || isCompleted) {
                return;
            }

            const finalizedText = `${toSecondsString(result.results.slice(-1)[0].starttime)} : ${result.text}\n`;
            if (updatedTextLength != 0) {
                acpTextarea.textContent = acpTextarea.textContent.slice(0, -updatedTextLength);
            }

            updatedTextLength = 0;
            acpTextarea.textContent += finalizedText;
        }
    ).then(() => {
        console.info('Finished ACP stream transcription.');

        if (updatedTextLength > 0) {
            acpTextarea.textContent += '\n';
        }

        acpTextarea.textContent += '[認識終了]\n';
        isCompleted = true;
    }).catch((error) => {
        console.error('Failed ACP stream transcription.', error);
        acpTextarea.textContent += '[認識エラー]\n';
        isCompleted = true;
    });
    acpTextarea.textContent += '[認識開始]\n';
}

/**
 * ミリ秒を秒の文字列に変換します。
 * @param {number} milliseconds ミリ秒
 */
function toSecondsString(milliseconds) {
    const roundedMilliseconds = Math.round(milliseconds);
    const stringMilliseconds = roundedMilliseconds.toString();
    if (roundedMilliseconds >= 1000) {
        return stringMilliseconds.substring(0, stringMilliseconds.length - 3) + '.' + stringMilliseconds.slice(-3);
    } else {
        return '0.' + ('000' + stringMilliseconds).slice(-3);
    }
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

    if (Gcp.isEnabledSpeechRecognition()) {
        Gcp.stopSpeechRecognition();
    }

    Azure.stopSpeechRecognition();

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

        Aws.setConfig(json); // AWS の設定は必須
        awsSection.style.display = Common.isSupportOggOpus() && Aws.isEnabledStreamTranscription() ? 'block' : 'none';
        gcpSection.style.display = Gcp.isEnabledSpeechRecognition() ? 'block' : 'none';
        azureFunctionName = json.AzureFunctionName;
        azureSection.style.display = Common.isSupportOggOpus() && azureFunctionName ? 'block' : 'none';
        acpFunctionName = json.AcpFunctionName;
        acpSection.style.display = Common.isSupportOggOpus() && acpFunctionName ? 'block' : 'none';

        Aws.checkLoginSession()
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
