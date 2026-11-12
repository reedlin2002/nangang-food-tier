export type Tier = 'S' | 'A' | 'B' | 'C' | 'D'

export type Restaurant = {
  id: string
  name: string
  cuisine: string
  area: string
  tier: Tier
  note: string
  drawback: string
  reason: string
  image: string
  imageCredit?: string
  imageCreditUrl?: string
  mapUrl: string
}

export const restaurants: Restaurant[] = [
  {
    id: 'noodle', name: '牛肉麵 A 店', cuisine: '牛肉麵', area: '南港車站', tier: 'S',
    note: '湯頭厚實，麵條很有存在感。', drawback: '尖峰時段可能需要排隊。', reason: '值得專程跑一趟的那種滿足。',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85', mapUrl: 'https://maps.google.com/?q=南港牛肉麵',
  },
  {
    id: 'curry', name: '咖哩 B 店', cuisine: '咖哩', area: '昆陽', tier: 'A',
    note: '香料層次很舒服，炸物也穩。', drawback: '熱門時段座位較少。', reason: '人在附近會主動想起來的店。',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=85', mapUrl: 'https://maps.google.com/?q=昆陽咖哩',
  },
  {
    id: 'ramen', name: '拉麵 C 店', cuisine: '拉麵', area: '南港展覽館', tier: 'B',
    note: '湯頭濃郁、叉燒好吃。', drawback: '價格稍高，尖峰時段需要排隊。', reason: '值得再訪，但還沒到 S Tier。',
    image: 'https://images.unsplash.com/photo-1565967711231-90a4d94f7423?auto=format&fit=crop&w=900&q=85', mapUrl: 'https://maps.google.com/?q=南港展覽館拉麵',
  },
  {
    id: 'bento', name: '便當 D 店', cuisine: '便當', area: '後山埤', tier: 'C',
    note: '份量足，口味表現普通。', drawback: '配菜選擇較少。', reason: '方便快速，沒有特別想再訪的理由。',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85', mapUrl: 'https://maps.google.com/?q=後山埤便當',
  },
]

export const tierInfo: Record<Tier, { title: string; color: string }> = {
  S: { title: '夯', color: 'tier-s' },
  A: { title: '頂級', color: 'tier-a' },
  B: { title: '人上人', color: 'tier-b' },
  C: { title: 'npc', color: 'tier-c' },
  D: { title: '拉完了', color: 'tier-d' },
}
