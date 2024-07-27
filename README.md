# playground-template

このリポジトリは、 [playground](https://github.com/devjam/playground)のサブモジュールとして追加される前提のテンプレートリポジトリで、[sdenv](https://github.com/yuheiy/sdenv)を元に作成されています。

## ⚠️リポジトリ名の命名規則

**リポジトリ名は必ず playground-[name] の形式で命名してください。**

- [name]は 単語間をハイフンでつなげる**kebab-case**で表記してください。
  - 例) snow-sample
- [name] はプロジェクトの詳細URLのスラグになります。
- リポジトリ名に基づいて、astro.config.ts の base 値が自動的に更新されます (npm ci 実行後)。

例:リポジトリ名が「`playground-particle`」の場合

- 詳細URL：https://playground.shiftbrain.com/post/particle/
- astro.config.ts：`base: '/post/particle'`

## ✅ 親リポジトリ([playground](https://github.com/devjam/playground))に追加する前にやること

### 1. サムネイルの差し替え

プロジェクトのサムネイルを適切な画像に差し替えてください。親リポジトリで一覧表示のサムネイルとして使用されます。デフォルトではダミー画像が配置されています。

- 場所: /public/thumbnail.webp
- サイズ: 800x800

> [!CAUTION]
> ファイル名は `thumbnail.webp` のままにしてください。他の名前や拡張子に変更しないでください。

### 2. OG画像の差し替え

デフォルトのものから更新してください。

- 場所: /src/assets/opengraph-image.png

### 3. static-productionブランチへ静的ファイルのビルド

release ブランチへのマージ後、GitHub Actionsが静的ファイルをビルドし static-production ブランチに自動的にビルドします。

> [!TIP]
> 親プロジェクトは static-production ブランチを参照しています。

## コマンドラインインターフェース

依存パッケージのインストール:

```bash
npm ci
```

---

`meta.json`の作成:

※`npm ci` 完了後に自動実行されるので、基本的に自分でコマンドを打つ必要はありません。

```bash
npm run setup:init
```

対話型CLIでプロジェクトについての質問に答えることで`src/meta.json`が作成されます。

> [!CAUTION]
> meta.json は親リポジトリで一覧表示するために必要な情報になります。削除しないでください。

---

meta.jsonのアップデート:

```bash
npm run update:meta
```

> [!NOTE]
> meta.json は手動変更も出来てしまいますが、既存のtagとの表記揺れ対策や文字数のバリデーションチェックも兼ねているので、上記コマンドを実行して変更するようにしてください。

---

ローカルサーバーの起動:

```bash
npm run dev
```

---

本番用ビルド:

```bash
npm run build
```

---

ソースコードの静的検証:

```bash
npm run lint
```

---

ソースコードの自動修正:

```bash
npm run fix
```

## ファイル構成

```
.
├── public/             # ビルドによって加工されないアセット
├── src/                # サイトのソースコード
│   ├── assets/         # ビルドによって加工されるアセット
│   ├── components/     # Astroコンポーネント
│   ├── content/        # Astroのコンテンツコレクション
│   ├── icons/          # astro-iconから参照されるSVGファイル
│   ├── layouts/        # ページの構造を規定するAstroコンポーネント
│   ├── pages/          # ページのためのAstroコンポーネント
│   ├── scripts/        # クライアントサイドで利用されるスクリプト
│   └── styles/         # Tailwind CSSによって読み込まれるCSSファイル
│   └── meta.json       # 一覧表示のために必要な情報がまとまったjson
├── astro.config.ts     # Astroの設定
├── package.json        # 依存パッケージを管理するための設定
├── postcss.config.cjs  # PostCSSの設定
├── tailwind.config.cjs # Tailwind CSSの設定
└── tsconfig.json       # TypeScriptの設定
```

詳しくは、Astro公式ドキュメントの「[Project Structure](https://docs.astro.build/en/core-concepts/project-structure/)」も参照してください。

> [!NOTE]
> sdenvからの変更点として、実装に大きく影響ありそうな箇所で以下変更を行っています。
>
> - `tailwind.config.cjs` の変更
>   - `screens`の変更
>   - `spacing` と `fontSize` をpx感覚で指定できるように（`px-10`と指定すると左右に`0.625rem`分のpaddingがつく）
>   - 最低限タイトルの背景で使う色やフォントの追加
