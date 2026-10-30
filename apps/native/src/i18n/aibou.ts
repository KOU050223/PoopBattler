// あいぼう画面専用の差分辞書。web の Collection 名前空間（web 辞書）を上書きしないよう NativeAibou に置く。
export const aibouJa = {
  NativeAibou: {
    previous: "まえのあいぼう",
    next: "つぎのあいぼう",
    level: "レベル {level}",
    hp: "たいりょく",
    power: "パワー",
    speed: "わざ",
    loadFailed: "うまく よみこめなかったよ",
    emptyTitle: "まだ あいぼうが いないよ",
    emptyHint: "うんちを すると なかまが ふえるよ",
    goHome: "ホームへ",
    attributes: {
      spicy: "からい",
      meat: "おにく",
      vegetable: "やさい",
      dairy: "ミルク",
      sweet: "あまい",
      curry: "カレー",
      normal: "ふつう",
    },
  },
};

export const aibouEn = {
  NativeAibou: {
    previous: "Previous buddy",
    next: "Next buddy",
    level: "Lv {level}",
    hp: "HP",
    power: "Power",
    speed: "Skill",
    loadFailed: "Couldn't load your buddies",
    emptyTitle: "No buddy yet",
    emptyHint: "Go poop to meet a new friend",
    goHome: "Home",
    attributes: {
      spicy: "Spicy",
      meat: "Meat",
      vegetable: "Veggie",
      dairy: "Dairy",
      sweet: "Sweet",
      curry: "Curry",
      normal: "Plain",
    },
  },
};
