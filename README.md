# realtime-speech-recognition-sample

[おためし！リアルタイム音声認識](https://nextpublishing.jp/book/14736.html)のサンプルです。
Amazon Cognitoを使って認証を行い、各音声認識サービスを使ってマイクからの音声をリアルタイムに音声認識します。

同名の[同人誌版](https://techbookfest.org/product/6148730564640768)は、バージョン0.1.0について解説したものになります。
こちらはAmazon Transcribeの音声認識のみとなります。

## 対象の音声認識サービス

このサンプルでは、以下の音声認識を動かすことができます。

* [Amazon Transcribe](https://aws.amazon.com/jp/transcribe/)
* Google Chromeの[Web Speech API](https://developer.mozilla.org/ja/docs/Web/API/Web_Speech_API)
* Microsoft Azureの[音声サービス](https://azure.microsoft.com/ja-jp/services/cognitive-services/speech-services/)
* [AmiVoice Cloud Platform](https://acp.amivoice.com/)

## ビルド手順

Node.jsをインストールし、package.jsonと同じフォルダで以下のコマンドを実行してください。
releaseフォルダにビルドされたファイルが生成されます。

```console
npm install
npm run build:production
```

## AWS Lambdaの関数のソースコード

リリースに含まれているAWS Lambdaの関数のソースコードは、以下のファイルを圧縮したものになります。

* getAzureAuthenticationToken.zip：lambda/azure/index.js
* getAcpAuthenticationToken.zip：lambda/acp/index.js
