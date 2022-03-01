/**
 * @file AWSに関する処理です。
 */
'use strict';

const { CognitoUserPool, CognitoUser, AuthenticationDetails } = require('amazon-cognito-identity-js');
const { CognitoIdentityClient } = require("@aws-sdk/client-cognito-identity");
const { fromCognitoIdentityPool } = require('@aws-sdk/credential-provider-cognito-identity');
const { TranscribeStreamingClient, StartStreamTranscriptionCommand, Transcript } = require('@aws-sdk/client-transcribe-streaming');
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

/**
 * AWSの設定です。
 * @typedef {object} AwsConfig
 * @property {string} RegionName リージョン名。
 * @property {string} UserPoolId ユーザープールID。
 * @property {string} ClientId クライアントID。
 * @property {string} IdentityPoolId IDプールID。
 * @property {boolean} Transcribe Amazon Transcribeを使用するかどうか。
 */

/**
 * 認識結果のコールバック関数です。
 * @callback TranscriptEventCallback
 * @param {Transcript} transcript 認識結果。
 */

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
 * AWS Lambda のクライアント。
 * @type {LambdaClient}
 */
let lambdaClient = null;

/**
 * 設定を設定します。
 * @param {AwsConfig} config
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

    lambdaClient = new LambdaClient({
        region: regionName,
        credentials: credentialProvider
    });
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
    return Boolean(transcribe);
}

/**
 * 音声認識ストリーミングを登録します。
 * @param {MediaRecorder} mediaRecorder 音声レコーダー。
 * @param {string} languageCode 言語コード。
 * @param {string} encoding 音声エンコーディング。
 * @param {number} sampleRateHertz サンプリングレート。
 * @param {TranscriptEventCallback} transcriptEventCallback 認識結果のコールバック関数。
 * @returns {Promise<any>} 非同期処理の結果。戻り値はなし。
 */
function registerStreamTranscription(mediaRecorder, languageCode, encoding, sampleRateHertz, transcriptEventCallback) {
    return new Promise((resolve, reject) => {
        // 型チェックもしたいですが、裏で同機能の別クラスにしていることがあるのでチェックしていません。
        if (!mediaRecorder) {
            reject(new Error('Not found \'mediaRecorder\'.'));
        }

        if (!languageCode) {
            reject(new Error('Not found \'languageCode\'.'));
        }

        if (!encoding) {
            reject(new Error('Not found \'mediaEncoding\'.'));
        }

        if (!sampleRateHertz) {
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
                        resolve();
                    }
                });
                mediaRecorder.addEventListener('stop', () => {
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

                // 空配列を渡すと音声認識が終了してしまいます。
                if (result.value && result.value.length > 0) {
                    yield { AudioEvent: { AudioChunk: result.value } };
                }
            }
        };
        const command = new StartStreamTranscriptionCommand({
            LanguageCode: languageCode,
            MediaEncoding: encoding,
            MediaSampleRateHertz: sampleRateHertz,
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
 * AWS Lambdaの関数を呼び出します。
 * @param {string} functionName 関数名。
 * @param {object} inputParameter 入力パラメーター。
 * @returns {Promise<object>} 非同期処理の結果。戻り値は出力パラメーター。
 */
function callLambdaFunction(functionName, inputParameter) {
    return new Promise((resolve, reject) => {
        if (!lambdaClient) {
            reject(new Error('AWS Lambda client is not prepared.'));
        }

        lambdaClient.send(new InvokeCommand({
            FunctionName: functionName,
            Payload: new TextEncoder().encode(JSON.stringify(inputParameter))
        }))
        .then(async (response) => {
            resolve(JSON.parse(new TextDecoder().decode(response.Payload)));
        })
        .catch((error) => {
            if (error instanceof Error) {
                reject(error);
            } else {
                reject(new Error(`Failed to call AWS Lambda function. : ${error}`));
            }
        });;
    });
}

// 外部に公開します。
export {
    setConfig,
    checkLoginSession,
    login,
    logout,
    isEnabledStreamTranscription,
    registerStreamTranscription,
    callLambdaFunction
}
