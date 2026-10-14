// latin1 対応の TextDecoder 補完は、fast-png を import する全モジュールより
// 先に評価される必要があるためエントリの先頭で行う。
import "./src/lib/textdecoder-latin1";

// エントリは expo-router に委譲する。
import "expo-router/entry";

// 便器検出モデルは画面未接続（T-009b で接続予定）のため、どの route からも
// require されず export のバンドル対象から漏れる。アセット解決が効いているかを
// export で確認するために、ここで資産登録だけを行う。
// モデルのロード（loadTensorflowModel）は画面側の useTensorflowModel が行う。
import "./src/features/battle/toilet-detection/ssd-model";
