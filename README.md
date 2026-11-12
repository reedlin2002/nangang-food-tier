# 南港吃什麼？

南港餐廳共識榜：公開瀏覽、管理者登入後維護餐廳與團體排名。

## 開發

```sh
npm install
npm run dev
```

複製 `.env.example` 為 `.env.local`，填入 Firebase Web app 設定。建立 Firestore，將 `firestore.rules` 發布到 Firebase。未設定 Firebase 時會顯示內建示範資料。

## 啟用管理者

1. Firebase Console → Authentication → Sign-in method，啟用 Email/Password。
2. Authentication → Users，手動新增管理者帳號；網站不提供公開註冊。
3. 在 Firestore 建立 `admins/{管理者 UID}` 文件（欄位可留空）。UID 可從 Authentication 使用者列表複製。
4. 開啟網站右上角「管理榜單」，使用該帳號登入。管理者可建立、編輯餐廳；選擇 Tier 即發布，評語可之後補上，Tier 留空則存為待評價。

Firestore rules 僅允許已發布資料公開讀取；管理者文件只允許本人讀取；只有 `admins` 名單的帳號可新增或修改資料，且不允許刪除。管理者名單只能由 Firebase Console 的專案管理者維護。

## Firestore 資料

餐廳與排名使用相同文件 ID 關聯：

- `restaurants/{restaurantId}`：`name`、`cuisine`、`area`、`mapUrl`、`image`、`published`
- `rankings/{restaurantId}`：`tier`（S/A/B/C/D 或 null）、`position`、`recommendation`、`drawback`、`consensus`、`published`
- `admins/{uid}`：管理者授權文件，文件 ID 必須是 Firebase Auth UID

設定 Firebase CLI 專案後，可用 `firebase deploy --only firestore:rules,hosting` 發布 rules 與 Hosting。

## 功能

- Tier List 與餐廳清單切換、搜尋與料理篩選
- Google Maps 連結與團體排名理由
- 管理者登入、新增／編輯餐廳、待評價清單及發布
- 手機版版面
