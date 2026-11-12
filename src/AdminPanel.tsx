import { useEffect, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { Tier } from './data'

type Entry = { id: string; name: string; cuisine: string; area: string; mapUrl: string; image: string; tier: Tier | ''; recommendation: string; drawback: string; consensus: string; published: boolean; position: number }
const blank: Entry = { id: '', name: '', cuisine: '', area: '', mapUrl: '', image: '', tier: '', recommendation: '', drawback: '', consensus: '', published: false, position: 0 }
const firstRankings: Omit<Entry, 'cuisine' | 'area' | 'mapUrl' | 'image' | 'recommendation' | 'drawback' | 'consensus' | 'published' | 'position'>[] = [
  { id: 'liang-she-han-xinghua', name: '梁社漢排骨（南港興華店）', tier: 'A' },
  { id: 'tai-mei-li', name: '泰美利', tier: 'A' },
  { id: 'hou-bi-niu', name: '後壁牛牛肉麵館', tier: 'B' },
  { id: 'kan-ji-cold-noodles', name: '闞記涼麵', tier: 'B' },
  { id: 'little-happiness-brunch', name: '小確幸早午餐', tier: 'B' },
  { id: 'jia-yuan-scallion-pancake', name: '佳元蔥油餅舖（南港店）', tier: 'B' },
  { id: 'ba-fang-xinghua', name: '八方雲集（興華店）', tier: 'B' },
  { id: 'doujiang-ge', name: '豆漿哥早點宵夜', tier: 'B' },
  { id: 'ding-yuan-beef-noodles', name: '鼎園牛肉麵館', tier: 'D' },
]
const failureMessage = (reason: unknown) => reason instanceof Error ? reason.message : String(reason)

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const firebaseAuth = auth
  const firestore = db
  const [user, setUser] = useState<User | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [form, setForm] = useState<Entry>(blank)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => firebaseAuth ? onAuthStateChanged(firebaseAuth, async (nextUser) => {
    setUser(nextUser)
    setAuthorized(false)
    if (!nextUser || !firestore) return
    try {
      const allowed = (await getDoc(doc(firestore, 'admins', nextUser.uid))).exists()
      setAuthorized(allowed)
      if (allowed) {
        const [restaurants, rankings] = await Promise.all([getDocs(collection(firestore, 'restaurants')), getDocs(collection(firestore, 'rankings'))])
        const rankingById = new Map(rankings.docs.map((item) => [item.id, item.data()]))
        setEntries(restaurants.docs.map((item) => {
          const restaurant = item.data(), ranking = rankingById.get(item.id) ?? {}
          return { id: item.id, name: restaurant.name ?? '', cuisine: restaurant.cuisine ?? '', area: restaurant.area ?? '', mapUrl: restaurant.mapUrl ?? '', image: restaurant.image ?? '', tier: ranking.tier ?? '', recommendation: ranking.recommendation ?? '', drawback: ranking.drawback ?? '', consensus: ranking.consensus ?? '', published: ranking.published === true, position: ranking.position ?? 0 } as Entry
        }))
      }
    } catch { setError('無法確認管理員權限，請檢查 Firebase 設定與網路。') }
  }, (reason) => setError(reason.message)) : undefined, [firebaseAuth, firestore])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!firestore || !form.name.trim() || !form.cuisine.trim() || !form.area.trim() || !/^https:\/\//i.test(form.mapUrl)) return
    setBusy(true); setError('')
    try {
      const batch = writeBatch(firestore)
      const restaurantRef = form.id ? doc(firestore, 'restaurants', form.id) : doc(collection(firestore, 'restaurants'))
      const rankingRef = doc(firestore, 'rankings', restaurantRef.id)
      const ranked = Boolean(form.tier)
      batch.set(restaurantRef, { name: form.name.trim(), cuisine: form.cuisine.trim(), area: form.area.trim(), mapUrl: form.mapUrl.trim(), image: form.image.trim(), published: ranked }, { merge: true })
      batch.set(rankingRef, { tier: ranked ? form.tier : null, recommendation: form.recommendation.trim(), drawback: form.drawback.trim(), consensus: form.consensus.trim(), position: form.position, published: ranked }, { merge: true })
      await batch.commit()
      setEntries((current) => [...current.filter((item) => item.id !== restaurantRef.id), { ...form, id: restaurantRef.id, published: ranked }].sort((a, b) => a.tier.localeCompare(b.tier) || a.position - b.position))
      setForm(blank)
    } catch (reason) { setError(`儲存失敗：${failureMessage(reason)}`) }
    finally { setBusy(false) }
  }

  async function importFirstRankings() {
    if (!firestore) return
    setBusy(true); setError(''); setStatus('')
    try {
      const knownIds = new Set(entries.map((entry) => entry.id))
      const missing = firstRankings.filter((entry) => !knownIds.has(entry.id))
      if (!missing.length) { setStatus('這批餐廳已經匯入過了。'); return }
      const imported: Entry[] = []
      for (const [index, entry] of missing.entries()) {
        const restaurantRef = doc(firestore, 'restaurants', entry.id)
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${entry.name} 台北市南港區興華路`)}`
        const batch = writeBatch(firestore)
        batch.set(restaurantRef, { name: entry.name, cuisine: '未分類', area: '興華路', mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${entry.name} 台北市南港區興華路`)}`, image: '', published: true })
        batch.set(doc(firestore, 'rankings', entry.id), { tier: entry.tier, position: index, recommendation: '', drawback: '', consensus: '', published: true })
        await batch.commit()
        imported.push({ ...entry, cuisine: '未分類', area: '興華路', mapUrl, image: '', recommendation: '', drawback: '', consensus: '', published: true, position: index })
        setEntries((current) => [...current.filter((item) => item.id !== entry.id), imported[imported.length - 1]])
        setStatus(`匯入中 ${imported.length}/${missing.length}…`)
      }
      setStatus(`已匯入 ${imported.length} 家，評語可之後再補。`)
    } catch (reason) { setError(`匯入失敗：${failureMessage(reason)}。已成功匯入的店家會保留，可再按一次繼續。`) }
    finally { setBusy(false) }
  }

  if (!firebaseAuth || !firestore) return <section className="admin-panel"><button onClick={onClose}>← 回排行榜</button><p role="alert">Firebase 尚未設定。</p></section>
  return <section className="admin-panel">
    <button onClick={onClose}>← 回排行榜</button><h2>榜單管理</h2>
    {error && <p role="alert">{error}</p>}
    {!user ? <form className="admin-login" onSubmit={(event) => { event.preventDefault(); setError(''); void signInWithEmailAndPassword(firebaseAuth, email, password).catch((reason: Error) => setError(reason.message)) }}>
      <p>使用已建立的管理者帳號登入。</p><label>電子郵件<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>密碼<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label><button disabled={busy}>登入</button>
    </form> : !authorized ? <div><p>此帳號尚未有管理權限。請將下方 UID 加入 Firestore 的 admins 文件 ID，完成後重新整理。</p><code>{user.uid}</code><button onClick={() => void signOut(firebaseAuth)}>登出</button></div> : <>
      <div className="admin-toolbar"><span>已登入：{user.email}</span><button onClick={() => void signOut(firebaseAuth)}>登出</button></div>
      <div className="admin-seed"><p>把你剛提供的 9 家餐廳依 Tier 加入公開榜單；評語留空，日後再補。</p><button disabled={busy} onClick={() => void importFirstRankings()}>{busy ? '處理中…' : '匯入這批排名'}</button></div>
      {status && <p role="status">{status}</p>}
      <form className="admin-form" onSubmit={submit}>
        <h3>{form.id ? '編輯餐廳' : '新增餐廳'}</h3>
        <label>店名<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>料理類型<input required value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} /></label><label>地區<input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></label><label>Google Maps 網址<input type="url" required value={form.mapUrl} onChange={(e) => setForm({ ...form, mapUrl: e.target.value })} /></label><label>照片網址（選填）<input type="url" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label>
        <label>Tier（留空代表待評價）<select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as Tier | '' })}><option value="">待評價</option>{['S', 'A', 'B', 'C', 'D'].map((tier) => <option key={tier}>{tier}</option>)}</select></label><label>同 Tier 排序（數字愈小愈前）<input type="number" min="0" step="1" value={form.position} onChange={(e) => setForm({ ...form, position: Math.max(0, Number(e.target.value)) })} /></label>
        <label>值得推薦<input value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} /></label><label>缺點<input value={form.drawback} onChange={(e) => setForm({ ...form, drawback: e.target.value })} /></label><label>團體最終共識<input value={form.consensus} onChange={(e) => setForm({ ...form, consensus: e.target.value })} /></label>
        <button disabled={busy}>{busy ? '儲存中…' : '儲存餐廳'}</button><button type="button" onClick={() => setForm(blank)}>清除</button>
      </form>
      <h3>餐廳與待評價清單</h3><ul className="admin-list">{entries.map((entry) => <li key={entry.id}><span>{entry.tier || '待評價'} · {entry.name}</span><button onClick={() => setForm(entry)}>編輯</button></li>)}</ul>
    </>}
  </section>
}
