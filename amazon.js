'use strict';

const AWS = require('aws-sdk/global');
// const Lambda = require('aws-sdk/clients/lambda');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

/**
 * リージョン名。
 * @type {string}
 */
let regionName;

/**
 * ユーザープールID。
 * @type {string}
 */
let userPoolId;

/**
 * クライアントID。
 * @type {string}
 */
let clientId;

/**
 * IDプールID。
 * @type {string}
 */
let identityPoolId;

/**
 * ユーザープール。
 * @type {AmazonCognitoIdentity.CognitoUserPool}
 */
let userPool = null;

/**
 * 認証情報を保持しているかどうか。
 * @type {boolean}
 */
let hasCredentials = false;

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

    userPool = new AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: userPoolId,
        ClientId: clientId,
        Storage: sessionStorage
    });
}

/**
 * AWSの認証情報を設定します。
 * @param {string} accessToken アクセストークン。
 * @returns {Promise<boolean>} 非同期処理の結果。戻り値に意味はありません。
 */
function setAwsCredentials(accessToken) {
    return new Promise((resolve, reject) => {
        const logins = {};
        logins['cognito-idp.' + regionName + '.amazonaws.com/' + userPoolId] = accessToken;
        AWS.config.region = regionName;
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: identityPoolId,
            Logins: logins,
        });
        AWS.config.credentials.clearCachedId(); // https://forums.aws.amazon.com/thread.jspa?threadID=243850
        AWS.config.credentials.refresh((error) => {
            if (error) {
                hasCredentials = false;
                reject(new Error(`Failed to refresh AWS credentials : ${error}`));
                return;
            }

            hasCredentials = true;
            resolve(true);
        });
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

            setAwsCredentials(session.getIdToken().getJwtToken())
            .then(() => {
                resolve(true);
            })
            .catch((error) => {
                reject(error);
            });
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

        const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: userName,
            Pool: userPool,
            Storage: sessionStorage
        });
        cognitoUser.authenticateUser(
            new AmazonCognitoIdentity.AuthenticationDetails({
                Username: userName,
                Password: password,
            }), {
                onSuccess: (session) => {
                    setAwsCredentials(session.getIdToken().getJwtToken())
                    .then(() => {
                        resolve(false);
                    })
                    .catch((error) => {
                        reject(error);
                    });
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
                                setAwsCredentials(session.getIdToken().getJwtToken())
                                .then(() => {
                                    resolve(true);
                                })
                                .catch((error) => {
                                    reject(error);
                                });
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

// 外部に公開します。
exports.setConfig = setConfig;
exports.checkLoginSession = checkLoginSession;
exports.login = login;
exports.logout = logout;
