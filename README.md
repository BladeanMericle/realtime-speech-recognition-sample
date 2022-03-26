# realtime-speech-recognition-sample

[おためし！リアルタイム音声認識](https://techbookfest.org/product/6148730564640768)のサンプルです。
Amazon Cognitoを使って認証を行い、各音声認識サービスを使ってマイクからの音声をリアルタイムに音声認識します。

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
