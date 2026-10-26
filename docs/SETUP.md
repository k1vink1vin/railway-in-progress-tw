# GitHub Pages 啟用教學

目前網站程式已可正常編譯。首次部署前，需要在 GitHub Repository 啟用一次 Pages。

## 第一次啟用

1. 開啟 `railway-in-progress-tw` repository。
2. 點上方 **Settings**。
3. 左側選單找到 **Pages**。
4. 在 **Build and deployment** 區塊：
   - **Source** 選擇 **GitHub Actions**。
5. 回到 repository 上方的 **Actions**。
6. 點選 **Deploy website to GitHub Pages**。
7. 點 **Run workflow** → **Run workflow**。

成功後，網站會部署到：

`https://k1vink1vin.github.io/railway-in-progress-tw/`

## 之後需不需要再按？

不用。

只要 `main` branch 有新 commit，GitHub Actions 就會自動重新 build 與部署。

## 如果看到紅色叉叉

進入：

**Actions → Deploy website to GitHub Pages → 最新一次執行**

展開失敗的步驟即可看到錯誤。網站資料更新的 workflow 後續也會用相同方式設計，並把錯誤訊息改成可讀的中文摘要。
