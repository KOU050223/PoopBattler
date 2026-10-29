// ホーム画面専用の差分辞書。web の Home 名前空間（report・account が参照中）を上書きしないよう NativeHome に置く。
export const homeJa = {
  NativeHome: {
    poop: "うんちする",
    meal: "ごはん",
    log: "きろく",
    streak: "れんぞく {count}にち",
    today: "うんち きょう{count}かい",
    fallbackCompanionName: "うんちくん",
    companionHint: "{name}のあいぼうがめんをひらく",
    settings: "ほごしゃメニュー",
    companionMessage: "きょうも ここで まってたブリ",
  },
};

export const homeEn = {
  NativeHome: {
    poop: "Go poop",
    meal: "Meals",
    log: "Log",
    streak: "Streak: {count} days",
    today: "Poops today: {count}",
    fallbackCompanionName: "Poopy",
    companionHint: "Open {name}'s page",
    settings: "Parent menu",
    companionMessage: "I was waiting right here today!",
  },
};
