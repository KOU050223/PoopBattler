// きろく画面（子ども向け）専用の辞書。ひらがな中心で短く。
export const kirokuJa = {
  Kiroku: {
    title: "きろく",
    streakLabel: "れんぞく",
    streakUnit: "にち",
    monthTitle: "{month}がつ",
    weekdays: ["にち", "げつ", "か", "すい", "もく", "きん", "ど"],
    recentTitle: "さいきんの うんち",
    today: "きょう {time}",
    yesterday: "きのう {time}",
    date: "{month}/{day} {time}",
    shape: { hard: "かため", normal: "ふつう", soft: "やわらかめ" },
    empty: "まだ きろくが ないよ",
    loadFailed: "よみこめなかったよ",
    stamped: "きろくあり",
  },
};

export const kirokuEn = {
  Kiroku: {
    title: "Log",
    streakLabel: "Streak",
    streakUnit: "days",
    monthTitle: "{month}",
    weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    recentTitle: "Recent poops",
    today: "Today {time}",
    yesterday: "Yesterday {time}",
    date: "{month}/{day} {time}",
    shape: { hard: "Hard", normal: "Normal", soft: "Soft" },
    empty: "No logs yet",
    loadFailed: "Couldn't load",
    stamped: "Logged",
  },
};
