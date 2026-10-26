# 官方資料來源策略

本專案第一階段不以行政區硬切，而是以具有固定軌道工程推動職能的主管機關為核心。

## 捷運

| 主管機關 | 主要用途 | 自動化策略 |
|---|---|---|
| 臺北市政府捷運工程局 | 興建中路網、各線計畫進度 | 可解析月度進度；需處理圖片／頁面格式差異 |
| 新北市政府捷運工程局 | 三鶯線、汐東線、基隆捷運等 | 路線頁＋新聞稿交叉整理 |
| 桃園市政府捷運工程局 | 軌道建設進度總覽、綠線工程進度 | 優先自動化，已有結構化進度文字與百分比 |
| 臺中市政府捷運工程局 | 藍線與後續路網推動進度 | 路網頁＋新聞稿／工程標案里程碑 |
| 臺南市捷運工程處 | 優先路網各線行政／工程階段 | 優先自動化，階段結構清楚 |
| 高雄市政府捷運工程局 | 各路線目前階段與工程進度 | 優先自動化，路線進度圖結構清楚 |

### 已驗證主要入口

- 臺北各線計畫進度：<https://www.dorts.gov.taipei/>
- 新北捷運工程局：<https://www.dorts.ntpc.gov.tw/>
- 桃園軌道建設進度總覽：<https://dorts.tycg.gov.tw/cp.aspx?n=23173>
- 臺中整體軌道路網：<https://tcrt.taichung.gov.tw/content/index?Parser=1%2C6%2C44>
- 臺南捷運進度公開：<https://traffic.tainan.gov.tw/RTO/StaticPage/ScheduleLine>
- 高雄捷運路線進度圖：<https://mtbu.kcg.gov.tw/KaohsiungMetro/Roadmapschedule.html>

## 臺鐵／高鐵

主要 Source of Truth：

- 交通部鐵道局：<https://www.rb.gov.tw/zh-TW/main/>

鐵道局目前已將計畫分為：
- 鐵路路網建設：規劃中／施工中／近年完成
- 鐵路立體化建設：規劃中／施工中／近年完成

## 進度欄位規則

網站同時保留兩種進度：

### 1. 官方百分比
僅當主管機關明確公布時寫入 `progressPercent`。

### 2. 統一建設階段
所有官方用語會映射到：

`feasibility → comprehensive-planning → approved → design → tender → construction → testing → operating`

並保留原始文字，避免因統一分類而遺失官方語意。

## 自動更新原則

1. Parser 先取得官方頁面。
2. 驗證名稱、百分比範圍、階段值與資料日期。
3. 若格式異常，不覆寫舊資料。
4. 第一階段採「自動產生變更、人工確認」。
5. 穩定來源才升級為自動 commit／部署。
