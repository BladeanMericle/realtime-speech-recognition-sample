/**
 * @file AWS に関する処理です。
 */
'use strict';

const { CognitoUserPool, CognitoUser, AuthenticationDetails } = require('amazon-cognito-identity-js');
const { CognitoIdentityClient } = require("@aws-sdk/client-cognito-identity");
const { fromCognitoIdentityPool } = require('@aws-sdk/credential-provider-cognito-identity');
const { TranscribeStreamingClient, StartStreamTranscriptionCommand, Transcript } = require('@aws-sdk/client-transcribe-streaming');

/**
 * リージョン名。
 * @type {string}
 */
let regionName = null;

/**
 * ユーザープールID。
 * @type {string}
 */
let userPoolId = null;

/**
 * クライアントID。
 * @type {string}
 */
let clientId = null;

/**
 * IDプールID。
 * @type {string}
 */
let identityPoolId = null;

/**
 * Amazon Transcribeを使用するかどうか。
 * @type {boolean}
 */
let transcribe = false;

/**
 * ユーザープール。
 * @type {CognitoUserPool}
 */
let userPool = null;

/**
 * Amazon Transcribe ストリーミングのクライアント。
 * @type {TranscribeStreamingClient}
 */
let transcribeStreamingClient = null;

/**
 * 設定を設定します。
 * @param {object} config
 */
function setConfig(config) {
    if (!config) {
        throw new Error('Not found amazon\'s config.');
    }

    regionName = config['RegionName'];
    if (!regionName) {
        throw new Error('Not found region name.');
    }

    userPoolId = config['UserPoolId'];
    if (!userPoolId) {
        throw new Error('Not found user pool ID.');
    }

    clientId = config['ClientId'];
    if (!clientId) {
        throw new Error('Not found client ID.');
    }

    identityPoolId = config['IdentityPoolId'];
    if (!identityPoolId) {
        throw new Error('Not found identity pool ID.');
    }

    transcribe = config['Transcribe'];

    userPool = new CognitoUserPool({
        UserPoolId: userPoolId,
        ClientId: clientId,
        Storage: sessionStorage
    });
}

/**
 * クライアントを準備します。
 * @param {string} accessToken アクセストークン。
 */
function prepareClient(accessToken) {
    const logins = {};
    logins['cognito-idp.' + regionName + '.amazonaws.com/' + userPoolId] = accessToken;
    const credentialProvider = fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: regionName }),
        identityPoolId: identityPoolId,
        logins: logins
    });
    if (isEnabledStreamTranscription()) {
        transcribeStreamingClient = new TranscribeStreamingClient({
            region: regionName,
            credentials: credentialProvider
        });
    }
}

/**
 * ログインセッションを確認します。
 * @returns {Promise<boolean>} 非同期処理の結果。戻り値はログインセッションが確認できたかどうか。
 */
function checkLoginSession() {
    return new Promise((resolve, reject) => {
        if (!userPool) {
            reject(new Error('Not found config.'));
            return;
        }

        const cognitoUser = userPool.getCurrentUser();
        if (!cognitoUser) {
            resolve(false);
            return;
        }

        cognitoUser.getSession((error, session) => {
            if (error) {
                reject(error);
                return;
            }

            if (!session.isValid()) {
                resolve(false);
                return;
            }

            prepareClient(session.getIdToken().getJwtToken())
            resolve(true);
        });
    });
}

/**
 * ログインします。
 * @param {string} userName ユーザー名。
 * @param {string} password パスワード。
 * @returns {Promise<boolean>} 非同期処理の結果。戻り値は初回ログインかどうか。
 */
function login(userName, password) {
    return new Promise((resolve, reject) => {
        if (!userPool) {
            reject(new Error('Not found config.'));
            return;
        }

        const cognitoUser = new CognitoUser({
            Username: userName,
            Pool: userPool,
            Storage: sessionStorage
        });
        cognitoUser.authenticateUser(
            new AuthenticationDetails({
                Username: userName,
                Password: password,
            }), {
                onSuccess: (session) => {
                    prepareClient(session.getIdToken().getJwtToken())
                    resolve(false);
                },
                onFailure: (error) => {
                    reject(new Error(`Failed to authenticate user : ${error}`));
                },
                newPasswordRequired: () => {
                    // 仮パスワードをそのまま確定します。
                    cognitoUser.completeNewPasswordChallenge(
                        password,
                        {},
                        {
                            onSuccess: (session) => {
                                prepareClient(session.getIdToken().getJwtToken());
                                resolve(true);
                            },
                            onFailure: (error) => {
                                reject(new Error(`Failed to complete new password challenge : ${error}`));
                            },
                        });
                },
            });
    });
}

/**
 * ログアウトします。
 */
function logout() {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
        return;
    }

    cognitoUser.signOut();
}

/**
 * 音声認識ストリーミングが有効かどうかを取得します。
 * @returns {boolean} 音声認識ストリーミングが有効かどうか。
 */
function isEnabledStreamTranscription() {
    return new Boolean(transcribe);
}

/**
 * 音声認識ストリーミングを登録します。
 * @param {MediaRecorder} mediaRecorder 音声レコーダー。
 * @param {string} languageCode 言語コード。
 * @param {string} mediaEncoding 音声エンコーディング。
 * @param {number} mediaSampleRateHertz サンプリングレート。
 * @param {TranscriptEventCallback} transcriptEventCallback サンプリングレート。
 * @returns {Promise<any>} 非同期処理の結果。戻り値は初回ログインかどうか。
 */
function registerStreamTranscription(mediaRecorder, languageCode, mediaEncoding, mediaSampleRateHertz, transcriptEventCallback) {
    return new Promise((resolve, reject) => {
        // 型チェックもしたいですが、裏で同機能の別クラスにしていることがあるのでチェックしていません。
        if (!mediaRecorder) {
            reject(new Error('Not found \'mediaRecorder\'.'));
        }

        if (!languageCode) {
            reject(new Error('Not found \'languageCode\'.'));
        }

        if (!mediaEncoding) {
            reject(new Error('Not found \'mediaEncoding\'.'));
        }

        if (!mediaSampleRateHertz) {
            reject(new Error('Not found \'mediaSampleRateHertz\'.'));
        }

        if (!transcriptEventCallback) {
            reject(new Error('Not found \'transcriptEventCallback\'.'));
        }

        if (!isEnabledStreamTranscription()) {
            reject(new Error('StreamTranscription config is not enabled.'));
        }

        if (!transcribeStreamingClient) {
            reject(new Error('AWS client is not login yet.'));
        }

        /** @type {ReadableStream<Uint8Array>} */
        const readableStream = new ReadableStream({
            start(controller) {
                let stopped = false;
                mediaRecorder.addEventListener('dataavailable', async (e) => {
                    /** @type {Blob} */
                    const data = e.data;
                    controller.enqueue(new Uint8Array(await data.arrayBuffer()));
                    if (stopped) {
                        controller.close();
                    }
                });
                mediaRecorder.addEventListener('stop', () => {
                    resolve();
                    stopped = true;
                });
            },
        });
        const audioStream = async function*() {
            const reader = readableStream.getReader();
            while (true) {
                const result = await reader.read();
                if (result.done) {
                    break;
                }

                if (result.value) {
                    yield { AudioEvent: { AudioChunk: result.value } };
                }
            }
        };
        const command = new StartStreamTranscriptionCommand({
            LanguageCode: languageCode,
            MediaEncoding: mediaEncoding,
            MediaSampleRateHertz: mediaSampleRateHertz,
            AudioStream: audioStream()
        });
        mediaRecorder.addEventListener('start', () => {
            transcribeStreamingClient.send(command)
            .then(async (response) => {
                if (!response.TranscriptResultStream) {
                    reject(new Error('Not found TranscriptResultStream.'));
                    return;
                }

                for await (const resultStream of response.TranscriptResultStream) {
                    if (resultStream.BadRequestException) {
                        reject(resultStream.BadRequestException);
                        break;
                    }

                    if (resultStream.ConflictException) {
                        reject(resultStream.ConflictException);
                        break;
                    }

                    if (resultStream.InternalFailureException) {
                        reject(resultStream.InternalFailureException);
                        break;
                    }

                    if (resultStream.LimitExceededException) {
                        reject(resultStream.LimitExceededException);
                        break;
                    }

                    if (resultStream.ServiceUnavailableException) {
                        reject(resultStream.ServiceUnavailableException);
                        break;
                    }

                    if (resultStream.TranscriptEvent && resultStream.TranscriptEvent.Transcript) {
                        transcriptEventCallback(resultStream.TranscriptEvent.Transcript);
                    }
                }
            })
            .catch((error) => {
                if (error instanceof Error) {
                    reject(error);
                } else {
                    reject(new Error(`Failed to start stream transcription. : ${error}`));
                }
            });
        });
    });
}

/**
 * 認識結果のコールバック関数です。
 * @callback TranscriptEventCallback
 * @param {Transcript} transcript 認識結果。
 */

// 外部に公開します。
export {
    setConfig,
    checkLoginSession,
    login,
    logout,
    isEnabledStreamTranscription,
    registerStreamTranscription
}
