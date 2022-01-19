/**
 * @file 共通処理です。
 */
'use strict';

/**
 * ページ読み込み時の処理を追加します。
 * @param {(this: Window, ev: Event)} loadAction ページ読み込み時の処理。
 */
function addLoadAction(loadAction) {
    if (typeof loadAction != 'function') {
        throw new Error(`'loadAction' is not function.`);
    }

    window.addEventListener('load', loadAction, {
        once: true,
        passive: true,
        capture: false,
    });
}

/**
 * クリック時の処理を追加します。
 * @param {HTMLElement} element HTML要素。
 * @param {(this: HTMLElement, ev: MouseEvent)} clickAction クリック時の処理。
 * @throws 要素の取得に失敗しました。
 */
function addClickEvent(element, clickAction) {
    if (!(element instanceof HTMLElement)) {
        throw new Error(`'element' is not HTMLElement.`);
    }

    element.addEventListener('click', clickAction, {
        once: false,
        passive: true,
        capture: false
    });
}

/**
 * 要素のIDからHTML要素を取得します。
 * @param {string} elementId 要素ID。
 * @returns {HTMLElement} HTML要素。
 * @throws 要素の取得に失敗しました。
 */
function getElementById(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Not found '${elementId}' element.`);
    }

    return element;
}

/**
 * 要素のIDからsection要素を取得します。
 * @param {string} elementId 要素ID。
 * @returns {HTMLElement} section要素。
 */
 function getSectionElement(elementId) {
    const element = getElementById(elementId);
    if (element.tagName != 'SECTION') {
        throw new Error(`'${elementId}' is not section element.`);
    }

    return element;
}

/**
 * 要素のIDからinput要素を取得します。
 * @param {string} elementId 要素ID。
 * @returns {HTMLInputElement} input要素。
 */
 function getInputElement(elementId) {
    const element = getElementById(elementId);
    if (!(element instanceof HTMLInputElement)) {
        throw new Error(`'${elementId}' is not HTMLInputElement.`);
    }

    return element;
}

/**
 * 要素のIDからbutton要素を取得します。
 * @param {string} elementId 要素ID。
 * @returns {HTMLButtonElement} button要素。
 */
function getButtonElement(elementId) {
    const element = getElementById(elementId);
    if (!(element instanceof HTMLButtonElement)) {
        throw new Error(`'${elementId}' is not HTMLButtonElement.`);
    }

    return element;
}

/**
 * 要素のIDからcanvas要素を取得します。
 * @param {string} elementId 要素ID。
 * @returns {HTMLCanvasElement} canvas要素。
 */
function getCanvasElement(elementId) {
    const element = getElementById(elementId);
    if (!(element instanceof HTMLCanvasElement)) {
        throw new Error(`'${elementId}' is not HTMLCanvasElement.`);
    }

    return element;
}

/**
 * 要素のIDからp要素を取得します。
 * @param {string} elementId 要素ID。
 * @returns {HTMLParagraphElement} p要素。
 */
function getParagraphElement(elementId) {
    const element = getElementById(elementId);
    if (!(element instanceof HTMLParagraphElement)) {
        throw new Error(`'${elementId}' is not HTMLParagraphElement.`);
    }

    return element;
}

/**
 * 要素のIDからtextarea要素を取得します。
 * @param {string} elementId 要素ID。
 * @returns {HTMLTextAreaElement} textarea要素。
 */
function getTextareaElement(elementId) {
    const element = getElementById(elementId);
    if (!(element instanceof HTMLTextAreaElement)) {
        throw new Error(`'${elementId}' is not HTMLTextAreaElement.`);
    }

    return element;
}

/**
 * JSONオブジェクトを読み込みます。
 * @param {string} path JSONのパス。
 * @returns {Promise<object>} JSONオブジェクト。
 */
function readJson(path) {
    return fetch(path, { cache: 'no-cache' }) // 更新が即時反映されるように、意図的にキャッシュを無効にしています。
    .then((response) => {
        if (response.status != 200) {
            throw new Error(`Failed to read '${path}'. (${response.status})`);
        }

        return response.json();
    })
    .then((response) => {
        return response;
    });
}

/**
 * "audio/ogg;codecs=opus"形式をサポートしているかどうかを取得します。
 * @returns {boolean} "audio/ogg;codecs=opus"形式をサポートしているかどうか。
 */
function isSupportOggOpus() {
    const audioMime = 'audio/ogg;codecs=opus';
    return window.MediaRecorder && window.MediaRecorder.isTypeSupported(audioMime);
}

/**
 * "audio/ogg;codecs=opus"形式の音声レコーダーを作成します。
 * @param {MediaStream} mediaStream 音声メディアストリーム。
 * @returns {MediaRecorder} 音声レコーダー。
 */
function createOggOpusMediaRecorder(mediaStream) {
    const audioMime = 'audio/ogg;codecs=opus';
    const options = { mimeType: audioMime };

    if (!window.MediaRecorder || !window.MediaRecorder.isTypeSupported(audioMime)) {
        return null; // TODO "audio/ogg;codecs=opus"に対応するMediaRecorder相当のクラスを用意する
    }

    return new window.MediaRecorder(mediaStream, options);
}

// 外部に公開します。
export {
    addLoadAction,
    addClickEvent,
    getSectionElement,
    getInputElement,
    getButtonElement,
    getCanvasElement,
    getParagraphElement,
    getTextareaElement,
    readJson,
    isSupportOggOpus,
    createOggOpusMediaRecorder
}