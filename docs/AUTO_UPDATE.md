# 自動更新操作教學

網站採「**官方網站自動檢查 → 產生 Pull Request → 人工確認 → Merge → 自動部署**」的方式。

這樣比直接讓爬蟲修改正式網站安全：如果政府網站改版或抓取結果異常，正式資料不會被覆蓋。

## 目前已接上的來源

目前已接上兩類自動來源：

- 桃園市政府捷運工程局「軌道建設進度總覽」
  - 桃園捷運綠線計畫總進度
  - 桃園鐵路地下化計畫總進度
- 交通部鐵道局各施工計畫詳細頁「工程進度」
  - 自動讀取「目前進度」
  - 自動讀取「統計截至日」
  - 只有已確認為施工中且有官方百分比的計畫才會納入自動更新

後續會逐一接臺北、新北、臺中、臺南與高雄的官方來源。

## 自動排程

GitHub Actions 每週一 **台灣時間 08:10** 自動執行。

如果官方資料沒有改變，不會產生任何 PR。

如果官方百分比有改變，會產生：

**Pull requests → 官方鐵道進度自動更新**

你只需要檢查數字是否合理，再按 **Merge pull request**。

Merge 後，GitHub Pages 會自動重新部署。

## 想立刻手動檢查

1. 進入 Repository。
2. 點上方 **Actions**。
3. 左側點 **Check official railway data**。
4. 點右上角 **Run workflow**。
5. Branch 保持 `main`。
6. 再點綠色 **Run workflow**。

執行完成後：

- 綠色勾勾＋沒有 PR：官方資料沒有變化。
- 綠色勾勾＋出現 PR：有新進度，請確認後 Merge。
- 紅色叉叉：不要修改資料，進入失敗步驟看中文錯誤原因。

## 第一次若無法自動建立 PR

GitHub 可能預設禁止 Actions 建立 Pull Request。只需設定一次：

1. **Settings**
2. **Actions**
3. **General**
4. 拉到 **Workflow permissions**
5. 選擇 **Read and write permissions**
6. 勾選 **Allow GitHub Actions to create and approve pull requests**
7. **Save**

之後即可使用。

## 安全檢查

目前 parser 具備以下保護：

- 百分比必須介於 0–100。
- 鐵道局資料只從各計畫詳細頁的「目前進度」欄位讀取，不把個別標案進度誤當整體進度。
- 找不到官方欄位時直接失敗，不寫入資料。
- 若工程進度一次倒退超過 3 個百分點，直接失敗等待人工檢查。
- 只有數字真的改變才修改 JSON。
- 正式網站不會直接被 parser 覆寫，必須經過 PR Merge。

## 若看到「官方頁面格式可能已改變」

這表示官方網站 HTML 結構可能改版。

此時**不用手動修 JSON，也不要強制 Merge**。保留舊資料即可，等 parser 修正後再重新 Run workflow。
