# nodif

ブラウザで動作する条件式ビジュアルエディタです。ANDを直列、ORを並列として論理回路のように編集できます。

## 使い方

1. `index.html` をブラウザで開く
2. ツールバーでノードを追加/グループ化
3. `JSON保存` / `JSON読込` で状態を保存・復元
4. `JS式出力` / `VBA式出力` で条件式へ変換

## ファイル

- `logic-circuit-editor.js`: ライブラリ本体（グローバル `LogicCircuitEditor`）
- `index.html`: 静的デモ環境
- `styles.css`: UIスタイル

## キー操作

- `Delete` or `Backspace`: 選択ノード削除
- `Ctrl+N`: AND追加
- `Ctrl+O`: ORグループ化
- `Ctrl+M`: NOT切替
