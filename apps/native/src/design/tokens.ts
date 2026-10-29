// 値の正本は docs/DESIGN.md「native 改修の方向」。バトル・相撲が使う @/theme とは別物として並存させる。
export const colors = {
  sky: "#5ec4f2",
  skySoft: "#dff3fd",
  leaf: "#7fcf5a",
  leafSoft: "#e8f7dc",
  sunset: "#ff9a4d",
  // pink 系は「押せる・選ばれている」専用。装飾に使うと押せる合図が効かなくなる。
  pink: "#ff7aac",
  pinkEdge: "#d9578b",
  // gold 系はご褒美・レア専用。
  gold: "#f5b81c",
  goldEdge: "#c98d00",
  ink: "#2f3440",
  inkSoft: "#5f6675",
  // 親の画面の枠・カード・背景
  line: "#e3e7ee",
  paper: "#ffffff",
  canvas: "#f6f8fb",
  // 泡の面（景色の上に載るため半透明）
  bubbleFill: "#ffffff4d",
  bubbleBorder: "#ffffff",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40, huge: 48 } as const;

export const radius = {
  // 親の画面のカード
  card: 24,
  // 両端が丸いピル形・完全な丸は十分大きい値で表す
  pill: 999,
  sheet: 32,
} as const;

export const borderWidth = {
  // 親の画面のカード枠
  line: 1,
  // 泡の内側の白い枠
  bubble: 3,
} as const;

export const shadow = {
  // 泡の外側のやわらかい影。硬いオフセット影は旧スタイルなので使わない。
  bubble: {
    shadowColor: colors.sky,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

// ぷっくりした厚み: 下辺だけ濃い色で太くする。
export const thickness = { bottomEdge: 5 } as const;

export const fontSize = {
  // 子どもの画面は 18 が基準、入らないときだけ 15 まで下げる。
  childBase: 18,
  childMin: 15,
  childTitle: 28,
  // 親の画面
  body: 16,
  caption: 13,
  title: 22,
} as const;

export const spring = {
  // 押したときにぷにっと縮んで戻る、強めのばね
  press: { damping: 12, stiffness: 400, mass: 0.6 },
  pressedScale: 0.92,
  // 待機中の小さな動き・シートなど
  gentle: { damping: 14, stiffness: 180, mass: 1 },
} as const;
