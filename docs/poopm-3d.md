# うんちくん 3Dモデル (poopm-3d)

2D のうんちくん（[`poopm.md`](./poopm.md)）を3D化したもの。AR表示や将来の3Dバトルで使う。見た目の約束は poopm.md が正であり、ここには3D固有の決め事だけを書く。造形リファレンスは [`pictures/poopm3dver2.0.png`](./pictures/poopm3dver2.0.png)（正面・背面・真上の3面図）。

## 成果物

`public/assets/poopm_3d/poopm_base.glb`（glTF バイナリ）。スキン付きメッシュ + デフォームボーン + アニメーションクリップを同梱する。座標はメートル、正面は +Z、原点は両足の接地位置。静的アセットとして配信し、three.js / `<model-viewer>` / AR 系でそのまま読める形にする。ベースは頭を持たない（`body` の y範囲は -1.35〜-0.31）— 頭ドーム+カールは後述の `head_var_<id>.glb` が供給する。

GLB は `scripts/poopm-3d/build_poopm_base.py` が生成する。ただし現行の `poopm_base.glb` は頭分離と編集残骸（`arm_L_old` / `*_bak` / `poopm_rig.001` など）除去のため、リポジトリ外の `unti.blend` を手作業で編集して再エクスポートしたもの。

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/poopm-3d/build_poopm_base.py
```

顔はメッシュに入れない。胴体前面に貼る透明テクスチャのフェイスプレートで表現し、個体差はテクスチャ差し替えで出す。テクスチャは2D版と同じ `/assets/poopm_parts/eyes|mouth/*.png` をそのまま使い、GLBのプレートには既定外見（`DEFAULT_APPEARANCE`）の `poopm_eye_a.png` / `poopm_mouth_a.png` を仮テクスチャとして焼き込み、単体のプレビューでも顔が出るようにする。眉毛は目パーツのPNGに含まれる（`poopm_eye_*.png` 参照）。

頭アクセサリも `poopm_base.glb` には含めない。`public/assets/poopm_3d/head_acc_<id>.glb`（`<id>` は `hat-a` などのパーツID）として個別出力し、実行時にロードして `head_acc` ノードへアタッチする方式も用意したが、現行は後述の `head_var_<id>.glb` 方式を使う。

アクセサリGLBは `scripts/poopm-3d/build_head_acc.py` が生成する。原点 = ソケット接地点、-Y が正面。プレビューは `render_head_acc_preview.py` で `scripts/poopm-3d/out/` にレンダリングできる。

`head_var_<id>.glb` は頭ごと差し替えるバリアントで、素頭を含む全 `HeadId` 分を用意する（none 素頭 / hat-a リーフ / hat-b 王冠 / hat-c 野球帽 / hat-d すっぽん / hat-e ゴーグル / hat-f デイジー）。頭ドーム＋カール＋アクセサリを1メッシュにまとめた手作り品で、ベースモデルと同じモデル空間座標（原点 = キャラ原点）に収まる。ベースは頭を持たないため、実行時に稼働リグの `b_root` 配下へ配置すればそのまま頭になる。ドーム部分は `poopm_body` マテリアルのため色違い対応に巻き込まれる。

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/poopm-3d/build_head_acc.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/poopm-3d/render_head_acc_preview.py
```

> 背景: 旧GLBではベースの `body` に頭ドーム+カールが焼き込まれていたため、`head_var` を被せると hat-c / hat-d でベースのカール先端が帽子からはみ出していた。またソケット用の `b_head_acc` が残骸リグ（`poopm_rig.001`）側にあり、`head_acc_<id>.glb` 方式が使えなかった。ベースの再エクスポートで頭分離と残骸リグ除去を行い、両方とも解消した。実行時は `head_var_<id>.glb` を稼働リグの `b_root` の子としてモデル原点に配置する。頭ドームの頂点は全て `b_root` にバインドされているため、これでアニメーションに正しく追随する。`head_acc_<id>.glb`（ソケット方式）は引き続き使わない。

Blender 側は `-Y` を正面にモデリングし、アーマチュアはデフォームボーンのみを glTF エクスポートする前提。ソケット用の `b_face` もデフォームボーンにして、書き出しで落ちないようにする。

## 固定と可変

固定・可変の方針は poopm.md と同じ。3Dでは「可変」をノード差し替え・テクスチャ差し替え・マテリアル差し替えで実現する。

| 部位 | 扱い | 3Dでの実現 |
| --- | --- | --- |
| 胴体 | 固定 | 閉じたドーム状ローブの3段積層 + 先端のカール。単一メッシュ `body`、マテリアル `poopm_body` |
| 手足 | 固定 | 細い棒状の腕脚に関節。手は掌なしの小枝状3本指、足は豆形の扁平楕円。マテリアル `poopm_limb`（胴体より濃い焦茶で固定）。スキンしてリグで動かす |
| 頭アクセサリ | 可変 | `head_var_<id>.glb` を個体ごとにロードして稼働リグの `b_root` 配下に配置 |
| 目・口 | 可変 | フェイスプレート `eye` / `mouth` のテクスチャを個体ごとに差し替え |
| 色 | 可変 | 胴体マテリアル `poopm_body` の baseColor を個体ごとに上書き。`poopm_limb` は変えない（色変化は胴体だけに効く） |

## ノード命名

コードから部位を触れるよう、名前で管理する。`poopm.appearances.ts` のパーツIDと対応させる想定。メッシュは素名、ボーンは `b_` 接頭辞で区別する。

- `body` — 胴体。マテリアル `poopm_body`
- `eye` / `mouth` — フェイスプレート。透明PNGを張った薄い平面で、実行時にテクスチャを差し替える。2D版と同じく `eye` は両目で1枚
- `head_acc` — 頭アクセサリのマウント用空ノード。アクセサリ本体は別GLBで、ベースモデルに同梱しない
- `arm_L` / `arm_R`, `hand_L` / `hand_R`, `leg_L` / `leg_R`, `foot_L` / `foot_R` — マテリアル `poopm_limb`

## リグ

ボーンは `b_` 接頭辞、左右サフィックスは `_L` / `_R`。全メッシュは `b_root` をルートとする1本のアーマチュアでスキンする。

- `b_root` — 接地原点。全体の移動・回転。頭バリアント（`head_var_<id>.glb`）のマウント先でもある
- `b_body1` → `b_body2` — 胴体を担う脊椎チェーン。スクワッシュ&ストレッチと前屈・反り用
- `b_face` — フェイスプレートのソケット。`b_body2` の子として胴体の屈伸・スクワッシュに顔を追従させる。`b_eye_L` / `b_eye_R` / `b_mouth` を子に持ち、目・口プレートはこれらにスキンされる
- 腕: `b_upperarm_{L,R}` → `b_forearm_{L,R}` → `b_hand_{L,R}` → `b_finger{a,b,c}_{L,R}`
- 脚: `b_thigh_{L,R}` → `b_shin_{L,R}` → `b_foot_{L,R}`

頭専用のボーンはない。頭は `head_var_<id>.glb` の静的メッシュを `b_root` の子に置く方式のため、頭の動きはルートの変形そのものになる。`head_acc` ノードは `b_root` の子として残っているが、ソケット方式は使っていない。

スキン方針:

- `body` は `b_body1〜2` に段ごとに重みを分け、段間はブレンドする
- 腕脚はチェーンに沿ったウエイト。肘・膝・指の付け根は隣接ボーンでブレンドし、極端な潰れを避ける
- `eye` / `mouth` プレートは `b_eye_{L,R}` / `b_mouth` にスキンする。`head_var` のメッシュはスキンせず、実行時に `b_root` へ親子付けする
- `hand_*` / `foot_*` メッシュは対応する `b_hand_*` / `b_foot_*` にリジッド、指先は各 `b_finger*` へ

## アニメーション

クリップはGLB内に同梱し、three.js 側は `AnimationMixer` で名前再生する。クリップ名はコード側のモーション名（`POOPM_3D_BATTLE_MOTIONS` / `POOPM_3D_CLIPS`）に合わせる。同梱クリップは `idle` / `idle_stale` / `attack` / `hit` / `heal` / `special_charge` / `special_fire` / `swap_in` / `swap_out` / `ko` / `lose` / `win` の12本（`heal` は Issue #199 用の予約）。`hit` など once クリップの終了後はコード側が `idle` へ戻す。

まばたき・口の動きは `b_eye_{L,R}` / `b_mouth` のスキン変形で行う。

## 構築メモ

- 胴体は「閉じたローブの3段積層」で作る。各段は底が平らすぎないドーム状の回転体で、段同士の境に明確な溝が入る。真上から見ると同心円状の3リングに読める。トーラスは使わない（穴の影響で段の丸みが損なわれるため）
- 先端カールは上段の上に乗る独立した「とんがり」で、前方（-Y）かつ斜め横に倒れたコンマ型。最上段ローブの高さの半分〜同程度の存在感にする
- 顔は胴体前面（中段〜上段）に貼るフェイスプレート。`eye`・`mouth` は別プレートにして組み合わせの自由度を保つ。胴体表面から微小オフセットさせてzファイティングを避け、胴体前面の膨らみに沿う浅いカーブにする。マテリアルは透過 + alphaTest
- プレートの大きさ・配置は2D版のレイアウト（`poopm-figure` のパーツ比率）を基準に合わせる。目は大きめの縦長楕円が2つ、口は中段下部の開いた笑い口
- 腕脚は素の円柱ではなく、肩・肘・手首／股・膝・足首の節が読める丸みのあるメッシュにする。腕の付け根は中段側面、レストポーズは斜め上45°のバンザイ気味。脚は外八気味に開く
- 手は掌を持たない小枝状で、短い3本の指が扇状に開く。足は接地する豆形の扁平楕円。細さと短さは2Dのシルエット優先を継承し、服や靴は足さない
- 後ろ姿は2D同様に別パーツを用意しない。フェイスプレートを非表示にし、頭だけ左右反転する。正面から使う前提

## 実行時の利用

戦闘画面（`/battle`）のキャラ描画は react-three-fiber で `poopm_base.glb` を表示する。`src/features/poopm-3d/` の `Poopm3DStage`（Canvas + ライト + 床影）に味方・敵それぞれの外見（`Poopm3DAppearance` = 体色・目・口・頭）とモーションを渡す。体色は `poopm_body` マテリアルの baseColor、目・口はフェイスプレートのテクスチャを `EYES_PNG` / `MOUTH_PNG` の PNG で差し替え、頭は `head_var_<id>.glb` を `b_root` 配下に配置する。モーションはモーション名（`POOPM_3D_BATTLE_MOTIONS`）+ nonce を渡し、モーション名 → クリップ・ループ・フェード時間の対応は `poopm-3d.motion.ts`、バトルの状態差分からモーションを決める状態機械は `battle-stage-motion.ts` が持つ。表示確認は `/dev/poopm-3d`（開発環境のみ）。

実行時はメッシュノードをホワイトリスト（`poopm-3d-model.tsx` の `VISIBLE_MESH_NODES`）で絞って表示する。現行GLBは残骸なしだが、将来の再エクスポートで編集残骸が混じっても映り込まない。

## バリアント追加の手順

1. 目・口は新しいPNGを `/assets/poopm_parts/eyes|mouth/` に追加し、実行時にプレートのテクスチャを差し替える。モデルは変更しない
2. 頭は `head_var_<id>.glb`（頭ドーム＋カール＋アクセサリ一体、モデル空間座標）として別GLB出力する。ベースは頭を持たないため、これがそのまま頭になる。実行時は `b_root` 配下に配置される。`head_acc_<id>.glb`（ソケット方式）は使わない
3. `poopm.appearances.ts` 側のパーツIDと対応付ける
4. 胴体色はモデルを増やさず `poopm_body` の色違いで対応する
