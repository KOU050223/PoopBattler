# ガチャ演出AR化 検証

Issue [#171](https://github.com/KOU050223/PoopBattler/issues/171)。
「床面で方角を認識して法線方向を確定し、画像認識した座標からうんちくんが飛び出す」演出が、Web版（PWA）で実現できるかを調べた記録。

## 結論

**擬似ARルートなら実現可能。追加ライブラリなし、iOS/Android 両対応。**
真の平面検出・6DoF トラッキングは Web では iOS が使えないため本命にできない（調査issue [#130](https://github.com/KOU050223/PoopBattler/issues/130) と同じ結論）。

## Plan の分解と可否

| 要件 | 手段 | 可否 |
| --- | --- | --- |
| 床面の法線（世界の上向き）確定 | `devicemotion` の `accelerationIncludingGravity`（x,y,z）。加速度計は重力の反力（=上向き）を返すので測定値がそのまま床法線。ピッチ＋ロールまで取れる | ◎ |
| 画像認識座標からの出現 | 便器 bbox → 表示座標（`mapCoverBBox` 済）→ three.js カメラのレイにアンプロジェクトし仮想床面へ配置 | ◎ |
| サイズ感の現実連動 | 深度は取れない。bbox 高さ ÷ 便器実寸（便座〜全高で約0.4〜0.8m）で粗い距離推定しモデルスケールに使う | ○ 粗い |
| 回転への追従 | `rotationRate`（ジャイロ）の短期積分で3DoF補償。reveal は約2.2秒なのでドリフト誤差は無視できる | ○ |
| 並進への追従（6DoF） | 単眼RGBのみでは原理的に不可。reveal 中も便器検出を回し続け、bbox 移動で2D再アンカーする代替が現実的 | △ |
| 真の平面検出・hit-test | WebXR `immersive-ar`。Android Chrome のみ。iOS Safari は26系でも非対応（ARKitバックエンドはWebKitに入っているがセッションは動かない） | ✗ |

### 権限まわり

iOS の `DeviceMotionEvent.requestPermission` はバトル中の踏ん張り（`use-special-motion`）で取得済みのため、この画面で新しい許可ダイアログは要らない。床法線には重力ベクトルだけで足り、コンパス基準の `deviceorientation`（別途許可が必要・屋内で信用できない）は使わなくてよい。yaw（鉛直軸まわりの回転）だけジャイロ積分で賄う。

## 現状との差分 → 実装済み

reveal の3Dモデルは既にカメラ映像へ重ねてあったが、ARとして足りない3点をこのissueで実装した。

1. **法線が2D止まり** → 重力ベクトル3成分（`gravityUpVec`）を床法線として3Dシーンへ反映。`Poopm3DSolo` の `gravityUp` prop でモデルと床影を足裏ピボットで傾ける。DOM の2D `rotate` は廃止
2. **アンカーが固定** → 検出を summary まで継続し、reveal 中は `hit` の検出座標へ `resolveRevealTarget` で追従。見失った瞬間は投げ入れ先に留まる
3. **サイズ固定** → `ToiletSight.sizeFraction`（bbox高さ/表示高さ）から `gachaRevealScale` でスケール推定（0.6〜1.8にクランプ）

ジャイロ積分による回転補償は未実装。検出ベースの再アンカーがパンへの追従を担うため、必要になったら別途検討する。

## 制約・リスク

- **カメラFOVが取れない**。`getUserMedia` / `getSettings()` はFOVを返さない。映像と three.js カメラのFOV不一致があると、回転補償・アンカー再配置のたびにズレが見える。縦FOV 55〜65°の仮定値か、端末別キャリブレーション定数が要る
- **距離推定は信頼しすぎない**。便器の見え方（全身か座面だけか）で bbox 高さが変わる。スケール推定はクランプ必須
- **`<model-viewer>` の AR Quick Look**（iOS の真のAR）はページを離れる別UX。「便器から飛び出す」インライン演出とは相性が悪く、採用しない

## 実機検証チェックリスト

HTTPS必須（カメラ・モーションAPIとも）。Vercel Preview Deployment か HTTPS トンネル経由。

- [ ] iPhone Safari / Android Chrome の両方で reveal まで一巡できる
- [ ] 便器を下から覗く・上から覗く両方の構図でモデルの立ち方が破綻しない
- [ ] reveal 中にスマホをゆっくり回してもアンカーが大きくずれない
- [ ] モーション拒否・カメラ拒否のフォールバックが現行どおり動く
- [ ] `prefers-reduced-motion` で演出が即スキップされる
