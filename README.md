# Hololive ASMR Shelf MVP

ホロライブ現役メンバーと卒業生のASMR配信を整理するための、静的サイトMVPです。

## できること

- ASMR配信カード一覧
- メンバー、タイトル、タグ検索
- 現役 / 卒業生フィルター
- 言語フィルター
- 気分タグフィルター
- お気に入り保存
- 今夜のキュー作成
- 連続再生、シャッフル、自動補充
- スリープタイマー
- 睡眠モード
- YouTube IFrame Player APIによる埋め込み再生

## データ差し替え

`sample-data.js` の `window.ASMR_VIDEOS` を実データに置き換えます。

```js
{
  id: "unique-video-id",
  youtubeId: "YouTubeの動画ID",
  title: "配信タイトル",
  member: "メンバー名",
  status: "active", // active | graduated
  branch: "JP",
  generation: "0期生",
  date: "2026-01-12",
  duration: "1:42:00",
  language: ["ja"],
  tags: ["睡眠導入", "囁き", "耳かき"],
  equipment: ["KU100"],
  note: ""
}
```

動画や音声は再配布せず、公式YouTube動画IDを使う想定です。

## ローカルで見る方法

ブラウザで `index.html` を開けば表示できます。YouTube埋め込みがブラウザ設定で制限される場合は、任意の静的サーバーでこのフォルダを配信してください。
