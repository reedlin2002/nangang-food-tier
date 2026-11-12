import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase'
import type { Restaurant, Tier } from './data'

const tiers: Tier[] = ['S', 'A', 'B', 'C', 'D']
const validTiers = new Set<Tier>(tiers)

const sourcedPhotos: Record<string, { image: string; credit: string; url: string }> = {
  'liang-she-han-xinghua': { image: 'https://shaper.fooday.app/width%3D1200%2Cquality%3D75%2Cformat%3Dauto/fMHwymumFi8mEeZxsdiLXL', credit: 'Fooday', url: 'https://fooday.app/en/reviews/FbEc2zLmBa9XJes3YtbVWA' },
  'tai-mei-li': { image: 'https://megapx-assets.dcard.tw/images/07cfd10b-8bbe-47ed-83d2-2fdb9da8bede/1280.jpeg', credit: 'Dcard 食記', url: 'https://www.dcard.tw/f/food/p/255370839' },
  'hou-bi-niu': { image: 'https://pimg.1px.tw/threethree33/1682216701-2203141355-g.jpg', credit: '三三の三猛海試', url: 'https://threethree.tw/【台北南港區】後壁牛牛肉麵-x-紅燒牛肉麵/' },
  'kan-ji-cold-noodles': { image: 'https://mook-aws.hmgcdn.com/public/article/a2/22355/A22355_1573202278_1.jpg', credit: 'MOOK', url: 'https://www.mook.com.tw/article/22355' },
  'jia-yuan-scallion-pancake': { image: 'https://carlming.net/wp-content/uploads/2021/11/20211118-img_7847G.jpg', credit: '卡爾茗 Carlming', url: 'https://carlming.net/19430' },
  'ba-fang-xinghua': { image: 'https://cdn.walkerland.com.tw/images/upload/poi/p86271/m31597/ca66cc6adb1d73fcb69d1c53cccbea101eab26cc.jpg', credit: 'WalkerLand', url: 'https://www.walkerland.com.tw/article/view/199807' },
}

function text(data: Record<string, unknown>, key: string): string | null {
  const value = data[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalText(data: Record<string, unknown>, key: string): string | null {
  const value = data[key]
  return typeof value === 'string' ? value.trim() : null
}

function webUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export async function getPublishedRestaurants(): Promise<Restaurant[]> {
  if (!db) throw new Error('Firebase is not configured')

  const [restaurantsSnapshot, rankingsSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'restaurants'), where('published', '==', true))),
    getDocs(query(collection(db, 'rankings'), where('published', '==', true))),
  ])

  const restaurantById = new Map<string, Omit<Restaurant, 'tier' | 'note' | 'drawback' | 'reason'>>()
  for (const document of restaurantsSnapshot.docs) {
    const data = document.data()
    const name = text(data, 'name')
    const cuisine = text(data, 'cuisine')
    const area = text(data, 'area')
    const mapUrl = webUrl(text(data, 'mapUrl'))
    if (!name || !cuisine || !area || !mapUrl) continue

    const sourcedPhoto = sourcedPhotos[document.id]
    const image = webUrl(text(data, 'image'))
    restaurantById.set(document.id, {
      id: document.id,
      name,
      cuisine,
      area,
      image: image ?? sourcedPhoto?.image ?? '',
      imageCredit: image ? undefined : sourcedPhoto?.credit,
      imageCreditUrl: image ? undefined : sourcedPhoto?.url,
      mapUrl,
    })
  }

  const rankedRestaurants: (Restaurant & { position: number })[] = []
  for (const document of rankingsSnapshot.docs) {
    const data = document.data()
    const restaurant = restaurantById.get(document.id)
    const tier = text(data, 'tier') as Tier | null
    const position = data.position
    const note = optionalText(data, 'recommendation')
    const drawback = optionalText(data, 'drawback')
    const reason = optionalText(data, 'consensus')
    if (!restaurant || !tier || !validTiers.has(tier) || typeof position !== 'number' || !Number.isFinite(position)) continue

    rankedRestaurants.push({
      ...restaurant,
      tier,
      note: note ?? '',
      drawback: drawback ?? '',
      reason: reason ?? '',
      position,
    })
  }

  return rankedRestaurants
    .sort((a, b) => tiers.indexOf(a.tier) - tiers.indexOf(b.tier) || a.position - b.position)
}
