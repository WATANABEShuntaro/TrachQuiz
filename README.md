# TrachQuiz (ゴミ分別クイズ)

市町村ごとのゴミ分別ルールを楽しく学べるクイズアプリです。
現在は「福島県会津若松市」のルールに対応しています。

## 特徴
- **JSONでルール管理**: `rules/` フォルダ内のJSONファイルを差し替えるだけで、他の市町村にも対応可能。
- **豆知識（トリビア）機能**: 正解・不正解の後に、そのゴミに関する豆知識を表示し、知的好奇心を刺激します。
- **レスポンシブデザイン**: スマホでもPCでも快適に遊べます。

## 開発プロセス (プロンプト履歴)
このアプリは、AIアシスタントとのペアプログラミングによって作成されました。
以下は、開発時に入力されたプロンプト（指示）の履歴です。これらを参考にすることで、同様のアプリを再現できます。

### 1. 最初のアイデア
> ゴミの分別方法が市町村で微妙に異なって難しいのでクイズ形式で楽しく学べるサイトかAIチャットを作りたい

### 2. 具体的な要件とデータソース
> 市町村ごとのルールファイルを設定することで複数の市町村に対応したい。会津若松市のルールファイルを作ってアプリを作ってください。ルールはこちら https://www.city.aizuwakamatsu.fukushima.jp/docs/2009120800017/

### 3. バグ修正と改善指示
> （テストコードへの指摘）btn.textContent === '資源物'と固定されているのが良くないデータファイルと比較するようにしてください

> 「クイズを始める」を押すと正解画面までいってしまいます
> 変わりません。 一瞬画面が変わって直ぐに正解画面が表示されます
> Cacheを無効化しても同じです。正解・不正解の表示の前に問題を表示して答えを選択する画面が必要です

### 4. 機能追加（エンハンス）
> 動作しました。 知的好奇心が刺激されて、何度も繰り返して遊びたいように変更したい。 どんな案がありますか？ プログラムは変更せずに案だけを教えてください

> （提案を受けて）「へぇ〜」となれる方向が良いですね

### 5. 公開
> 一旦、この状態でGithub Pagesで公開したい

## 使い方

### 準備

**Windows 11 Only**

1. Pythonをインストール
   Microsoft Storeから「Python Install Manager」でインストール
   ![PythonInstallManager.png](images/PythonInstallManager.png)
2. Build Tools for Visual Studio
   1. [Build Tools for Visual Studio](https://visualstudio.microsoft.com/ja/downloads/?q=build+tools)からBuild Tools for Visual Studioをダウンロード
   ![DevTools.png](images/DevTools.png)
   2. 「C++によるデスクトップ開発」と「MSVC v143 - VS 2022 C++」にチェックを入れてインストール
   ![vs_BuildTools.png](images/vs_BuildTools.png)
3. Zadig
   1. [Zadig](http://zadig.akeo.ie/)をダウンロード
   2. NFCリーダーを接続
   3. ダウンロードしたzadig-2.9.exeを実行
   4. Options -> List All Devicesをクリック
   ![ListAll.png](images/ListAll.png)
   5. ACR122Uを選択
   ![selectDevuice.png](images/selectDevuice.png)
   6. Install Driverをクリック
4. libusb
   1. [libusb](https://libusb.info)をダウンロード (Downloads -> Latest Windows Binaries).
   2. libusb-1.0.29.7zを解凍
  [7zip](https://www.7-zip.org/download.html)など
   3. 下記ファイルをコピー
   * MS64\dll\libusb-1.0.dll → C:\Windows\System32
   * MS32\dll\libusb-1.0.dll → C:\Windows\SysWOW64

### 立ち上げ

1. ローカルサーバーを立ち上げます
   ```
   start_server.bat
   ```
2. `http://localhost:8080` にアクセスします。

## ライセンス
MIT License
