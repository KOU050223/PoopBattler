# ガチャの便器モデル

`toilet.glb` は再配布できないライセンスのため、git には入れていない（`.gitignore` 済み）。ビルドする前に各自で用意する。

- 出典: [Toilet Free low-poly 3D model (CGTrader)](https://www.cgtrader.com/free-3d-models/furniture/appliance/toilet-6771e91b-a7e8-4ced-96a5-910592a6a6e9)
- ライセンス: CGTrader Royalty Free License。商用利用・改変は可、ファイルの再配布（売却・再アップロード）は不可

## 入れ方

1. 出典ページから `Toilet.glb` をダウンロードする（11.7MB）
2. 軽量版を作って置く（法線マップを外し、テクスチャを 1024px に縮める。1.0MB になる。macOS の `sips` を使う）

```bash
python3 scripts/shrink-toilet-glb.py ~/Downloads/Toilet.glb apps/native/assets/gacha/toilet.glb
```

`toilet.glb` が無いと、ガチャ画面を含むアプリのバンドルが失敗する。
