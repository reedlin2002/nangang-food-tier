import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { restaurants as demoRestaurants, tierInfo, type Restaurant, type Tier } from './data'
import { hasFirebaseConfig } from './firebaseConfig'

const tiers: Tier[] = ['S', 'A', 'B', 'C', 'D']
const AdminPanel = lazy(() => import('./AdminPanel'))

function Mark({ name }: { name: 'search' | 'grid' | 'list' | 'arrow' | 'map' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15m6-12v15" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <article className="restaurant-card">
      <div className={`card-image${restaurant.image ? '' : ' no-photo'}`} role="img" aria-label={`${restaurant.name} 餐廳照片`} style={{ backgroundImage: restaurant.image ? `url(${restaurant.image})` : undefined }}>
        <span className={`image-tier ${tierInfo[restaurant.tier].color}`}>{restaurant.tier}</span>
        <span className="image-caption">團體共識</span>
      </div>
      {restaurant.imageCredit && restaurant.imageCreditUrl && <a className="photo-credit" href={restaurant.imageCreditUrl} target="_blank" rel="noreferrer">照片來源：{restaurant.imageCredit}</a>}
      <div className="card-content">
        <div className="card-meta"><span>{restaurant.cuisine}</span><i />{restaurant.area}</div>
        <h3>{restaurant.name}</h3>
        {restaurant.note && <p className="card-note">推薦 · {restaurant.note}</p>}
        {restaurant.drawback && <p className="card-drawback">缺點 · {restaurant.drawback}</p>}
        <div className="card-footer">
          {restaurant.reason && <span>{restaurant.reason}</span>}
          <a className="map-link" href={restaurant.mapUrl} target="_blank" rel="noreferrer" aria-label={`在 Google Maps 查看${restaurant.name}`}><Mark name="map" /><span>Google Maps</span><Mark name="arrow" /></a>
        </div>
      </div>
    </article>
  )
}

function App() {
  const [restaurants, setRestaurants] = useState(demoRestaurants)
  const [dataState, setDataState] = useState<'demo' | 'loading' | 'live' | 'error'>(hasFirebaseConfig ? 'loading' : 'demo')
  const [view, setView] = useState<'tier' | 'list'>('tier')
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('全部料理')
  const [showAdmin, setShowAdmin] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const cuisines = useMemo(() => ['全部料理', ...Array.from(new Set(restaurants.map((restaurant) => restaurant.cuisine)))], [restaurants])

  useEffect(() => {
    if (!hasFirebaseConfig) return
    let active = true
    void (async () => {
      try {
        const { getPublishedRestaurants } = await import('./restaurantService')
        if (!active) return
        const publishedRestaurants = await getPublishedRestaurants()
        if (!active) return
        setRestaurants(publishedRestaurants)
        setDataState('live')
      } catch {
        if (active) setDataState('error')
      }
    })()
    return () => { active = false }
  }, [refreshKey])

  const filtered = useMemo(() => restaurants.filter((restaurant) => {
    const matchesQuery = `${restaurant.name} ${restaurant.area} ${restaurant.cuisine}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (cuisine === '全部料理' || restaurant.cuisine === cuisine)
  }), [restaurants, query, cuisine])

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="南港吃什麼首頁"><span className="brand-mark">南</span><span>南港吃什麼？<small>THE NANGANG TABLE</small></span></a>
        <nav aria-label="主要導覽"><a className="nav-active" href="#ranking">排行榜</a><a href="#restaurants">餐廳清單</a></nav>
        <button className="nav-cta" onClick={() => setShowAdmin(true)}>管理榜單</button>
      </header>

      {showAdmin ? <Suspense fallback={<p className="data-state">載入管理工具…</p>}><AdminPanel onClose={() => { setShowAdmin(false); setRefreshKey((key) => key + 1) }} /></Suspense> : <>
      <main id="top">
        <section className="intro">
          <div className="intro-copy">
            <h1>南港吃什麼<span>？</span></h1>
          </div>
        </section>

        {dataState === 'demo' && <div className="notice" role="note"><span className="notice-dot" />目前為示範資料，餐廳與評價尚未代表實際排名。</div>}

        <section className="ranking-section" id="ranking">
          <div className="section-heading">
            <div><h2>大家吃過，大家說了算。</h2></div>
            <div className="view-switch" role="group" aria-label="選擇瀏覽方式">
              <button className={view === 'tier' ? 'selected' : ''} onClick={() => setView('tier')} aria-pressed={view === 'tier'}><Mark name="grid" />Tier List</button>
              <button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}><Mark name="list" />餐廳清單</button>
            </div>
          </div>

          <div className="filters" id="restaurants">
            <label className="search-field"><Mark name="search" /><input type="search" placeholder="搜餐廳、地區或料理..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <label className="cuisine-select"><span>料理類型</span><select value={cuisine} onChange={(event) => setCuisine(event.target.value)}>{cuisines.map((item) => <option key={item}>{item}</option>)}</select></label>
            <span className="filter-count">{filtered.length} 間店家</span>
          </div>

          {dataState === 'loading' ? <p className="data-state" role="status">正在載入排行榜…</p> : dataState === 'error' ? <p className="data-state" role="alert">無法連線到排行榜資料，請檢查 Firebase 設定後重新整理。</p> : view === 'tier' ? <div className="tier-board">
            {tiers.map((tier) => {
              const members = filtered.filter((restaurant) => restaurant.tier === tier)
              return <section className={`tier-row ${tierInfo[tier].color}`} key={tier} aria-label={`${tier} Tier：${tierInfo[tier].title}`}>
                <div className="tier-label"><strong>{tier}</strong><span>{tierInfo[tier].title}</span></div>
                <div className="tier-places">{members.length ? members.map((restaurant) => <RestaurantCard restaurant={restaurant} key={restaurant.id} />) : <p className="empty-tier">目前還沒有餐廳 <span>—</span></p>}</div>
                <span className="tier-index">0{tiers.indexOf(tier) + 1}</span>
              </section>
            })}
          </div> : <div className="list-view">
            {filtered.length ? filtered.map((restaurant) => <RestaurantCard restaurant={restaurant} key={restaurant.id} />) : <p className="no-results">{dataState === 'live' && restaurants.length === 0 ? '目前還沒有已發布的餐廳。' : '找不到符合條件的餐廳，試試其他關鍵字或料理類型。'}</p>}
          </div>}
        </section>

      </main>

      <footer><a className="brand footer-brand" href="#top"><span className="brand-mark">南</span><span>南港吃什麼？<small>THE NANGANG TABLE</small></span></a><span>由一頓頓飯和真心話共同編輯。<b>台北・南港</b></span><a href="#top">回到最上方 ↑</a></footer>
      </>}
    </div>
  )
}

export default App
