'use strict';

/**
 * 音声の周波数スペクトルの描画を行うクラスです。
 */
class FrequencyPainter {

    /**
     * コンストラクタ。
     * @param {AudioContext} audioContext 音声コンテキスト。
     * @param {MediaStream} mediaStream メディアストリーム。
     * @param {HTMLCanvasElement} canvasElement 周波数の波形を表示するcanvas要素。
     * @param {string} color 描画色。
     */
    constructor(audioContext, mediaStream, canvasElement, color) {
        if (!(audioContext instanceof AudioContext)) {
            throw new Error(`'audioContext' is not AudioContext.`);
        }

        if (!(mediaStream instanceof MediaStream)) {
            throw new Error(`'mediaStream' is not MediaStream.`);
        }

        if (!(canvasElement instanceof HTMLCanvasElement)) {
            throw new Error(`'canvasElement' is not HTMLCanvasElement.`);
        }

        if (!color) {
            throw new Error(`'color' is empty.`);
        }

        this.startDraw = () => {
            this.audioSourceNode = audioContext.createMediaStreamSource(mediaStream);
            this.analyserNode = audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;
            this.audioSourceNode.connect(this.analyserNode);

            const bufferLength = this.analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const canvasContext = canvasElement.getContext('2d');
            canvasContext.strokeStyle = color;
            canvasContext.fillStyle = color;
            canvasContext.lineWidth = 1;
            const canvasHeight = canvasElement.height;
            const canvasWidth = canvasElement.width;
            this.draw = () => {
                if (this.draw) {
                    // 録音中は再描画します。
                    window.requestAnimationFrame(this.draw);
                } else {
                    // 録音が停止したらキャンパスをクリアします。
                    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
                    return;
                }

                // 周波数データを配列にコピーする
                this.analyserNode.getByteFrequencyData(dataArray);

                canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
                canvasContext.beginPath();
                canvasContext.moveTo(0, canvasHeight);
                dataArray.forEach((element, index) => {
                    canvasContext.lineTo((index / bufferLength) * canvasWidth, canvasHeight - ((element / 255.0) * canvasHeight));
                });
                canvasContext.lineTo(canvasWidth, canvasHeight);
                canvasContext.closePath();
                canvasContext.fill();
                canvasContext.stroke();
            };
            this.draw();
        };
    }

    /**
     * 描画を開始します。
     */
    start() {
        if (this.draw) {
            return;
        }

        this.startDraw();
    }

    /**
     * 描画を停止します。
     */
    stop() {
        this.draw = null;

        if (this.audioSourceNode) {
            this.audioSourceNode.disconnect();
        }

        this.audioSourceNode = null;

        if (this.analyserNode) {
            this.analyserNode.disconnect();
        }

        this.analyserNode = null;
    }
}

// 外部に公開します。
exports.FrequencyPainter = FrequencyPainter;