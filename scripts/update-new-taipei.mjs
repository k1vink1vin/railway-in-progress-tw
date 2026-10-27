import fs from 'node:fs/promises'

const DATA_PATH = new URL('../src/data/projects.json', import.meta.url)

const HEADERS = {
  'User-Agent': 'railway-in-progress-tw/1.0 (+https://github.com/k1vink1vin/railway-in-progress-tw)',
  'Accept-Language': 'zh-TW,zh;q=0.9',
}

const targets = [
  {
    id: 'taipei-wanda-1',
    progressUrl: 'https://www.dorts.ntpc.gov.tw/about/routeProgress/8pRG2lkJmb5z',
    fallbackUrl: 'https://www.dorts.ntpc.gov.tw/news/indexInfo/vKR2Lp4E2JGp',
    fallbackPatterns: [
      /萬大中和線[^。]{0,100}?計畫進度(?:已)?達\s*([0-9]+(?:\.[0-9]+)?)\s*%/,
      /萬大中和線[^。]{0,120}?工程進度(?:已)?(?:達|逾)\s*([0-9]+(?:\.[0-9]+)?)\s*%/,
    ],
  },
  {
    id: 'taipei-circle-north-south',
    progressUrl: 'https://www.dorts.ntpc.gov.tw/about/routeProgress/bQw92Vzy2jOk',
    fallbackUrl: 'https://www.dorts.gov.taipei/News_Content_table.aspx?n=41977EB83537C82B&s=A6BE42F6367E5C59',
    fallbackPatterns: [
      /南環、北環工程[^。]{0,120}?進度(?:已)?達\s*([0-9]+(?:\.[0-9]+)?)\s*%/,
      /南環段[^。]{0,80}?北環段[^。]{0,120}?進度(?:已)?達\s*([0-9]+(?:\.[0-9]+)?)\s*%/,
      /工程進度(?:已)?達\s*([0-9]+(?:\.[0-9]+)?)\s*%/,
    ],
  },
  {
    id: 'ntpc-xidong',
    progressUrl: 'https://www.dorts.ntpc.gov.tw/about/routeProgress/8l19Zo7NZveD',
    fallbackUrl: 'https://www.dorts.ntpc.gov.tw/news/indexInfo/bxkZDp9KZJEw',
    fallbackPatterns: [
      /汐東線[^。]{0,160}?整體計畫進度(?:已)?達\s*([0-9]+(?:\.[0-9]+)?)\s*%/,
      /整體計畫進度(?:已)?達\s*([0-9]+(?:\.[0-9]+)?)\s*%/,
    ],
  },
]

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function taipeiDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function lastDayOfRocMonth(rocYear, month) {
  const year = Number(rocYear) + 1911
  const monthNumber = Number(month)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return [
    year,
    String(monthNumber).padStart(2, '0'),
    String(lastDay).padStart(2, '0'),
  ].join('-')
}

function parseProgressPage(text) {
  const dateMatch = text.match(/截至\s*(\d{2,3})\s*年\s*(\d{1,2})\s*月底/)
  const percentMatch = text.match(/本府管制計畫進度為\s*([0-9]+(?:\.[0-9]+)?)\s*%/)

  return {
    officialUpdatedAt: dateMatch ? lastDayOfRocMonth(dateMatch[1], dateMatch[2]) : null,
    rawProgress: percentMatch ? Number(percentMatch[1]) : null,
  }
}

function parseFallbackPercent(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return Number(match[1])
  }
  return null
}

function parsePublishedDate(text) {
  const western = text.match(/發布日期\s*(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/)
  if (western) {
    return [
      western[1],
      String(Number(western[2])).padStart(2, '0'),
      String(Number(western[3])).padStart(2, '0'),
    ].join('-')
  }

  const roc = text.match(/發布日期[：:]?\s*(\d{2,3})[-\/](\d{1,2})[-\/](\d{1,2})/)
  if (!roc) return null
  return [
    Number(roc[1]) + 1911,
    String(Number(roc[2])).padStart(2, '0'),
    String(Number(roc[3])).padStart(2, '0'),
  ].join('-')
}

function validateProgress(project, next) {
  if (!Number.isFinite(next) || next <= 0 || next > 100) {
    throw new Error('❌ ' + project.name + ' 抓到不合理的有效進度：' + next)
  }

  if (typeof project.progressPercent === 'number' && next + 3 < project.progressPercent) {
    throw new Error(
      '❌ ' + project.name + ' 進度由 ' + project.progressPercent + '% 降至 ' + next +
      '%，超過安全門檻，停止更新。'
    )
  }
}

async function fetchText(url) {
  const response = await fetch(url, { headers: HEADERS })
  if (!response.ok) {
    throw new Error('HTTP ' + response.status + '：' + url)
  }
  return stripHtml(await response.text())
}

const projects = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'))
const today = taipeiDate()

let changed = false
let reachablePages = 0

for (const target of targets) {
  const project = projects.find((item) => item.id === target.id)
  if (!project) throw new Error('❌ 找不到資料項目：' + target.id)

  let progressText
  try {
    progressText = await fetchText(target.progressUrl)
    reachablePages += 1
  } catch (error) {
    console.warn('⚠️ ' + project.name + ' 施工進度頁讀取失敗：' + error.message)
    continue
  }

  const parsedPage = parseProgressPage(progressText)
  const pageProgress =
    typeof parsedPage.rawProgress === 'number' && parsedPage.rawProgress > 0
      ? parsedPage.rawProgress
      : null

  if (parsedPage.rawProgress === 0) {
    console.log(
      'ℹ️ ' + project.name + ': 施工進度頁顯示 0% 佔位值' +
      (parsedPage.officialUpdatedAt ? '（頁面截至 ' + parsedPage.officialUpdatedAt + '）' : '') +
      '，不覆寫既有百分比。'
    )
  }

  let nextProgress = pageProgress
  let numericSourceUrl = pageProgress ? target.progressUrl : null
  let numericSourceDate = pageProgress ? parsedPage.officialUpdatedAt : null

  if (nextProgress === null && target.fallbackUrl) {
    try {
      const fallbackText = await fetchText(target.fallbackUrl)
      const fallbackProgress = parseFallbackPercent(fallbackText, target.fallbackPatterns)
      if (fallbackProgress !== null) {
        nextProgress = fallbackProgress
        numericSourceUrl = target.fallbackUrl
        numericSourceDate = parsePublishedDate(fallbackText)
      }
    } catch (error) {
      console.warn('⚠️ ' + project.name + ' 備援官方來源讀取失敗：' + error.message)
    }
  }

  if (nextProgress === null) {
    console.log('ℹ️ ' + project.name + ': 本次沒有可驗證的整體百分比，保留原資料。')
    continue
  }

  validateProgress(project, nextProgress)

  const progressChanged = project.progressPercent !== nextProgress
  const sourceDateChanged =
    numericSourceDate &&
    project.source?.officialUpdatedAt !== numericSourceDate &&
    project.source?.url === numericSourceUrl

  if (progressChanged || sourceDateChanged) {
    console.log(
      '✅ ' + project.name + ': ' +
      (typeof project.progressPercent === 'number' ? project.progressPercent + '%' : '—') +
      ' → ' + nextProgress + '%' +
      (numericSourceDate ? '（' + numericSourceDate + '）' : '')
    )

    project.progressPercent = nextProgress
    project.lastCheckedAt = today

    if (numericSourceUrl === target.progressUrl) {
      project.source = {
        agency: '新北市政府捷運工程局',
        title: project.name + '－施工進度',
        url: target.progressUrl,
        ...(numericSourceDate ? { officialUpdatedAt: numericSourceDate } : {}),
      }
      project.progressNote =
        '新北市政府捷運工程局施工進度頁公布之本府管制計畫進度：' +
        nextProgress.toFixed(2) + '%' +
        (numericSourceDate ? '，截至' + numericSourceDate + '。' : '。')
    } else if (numericSourceDate && project.source?.url === numericSourceUrl) {
      project.source.officialUpdatedAt = numericSourceDate
    }

    changed = true
  } else {
    console.log('ℹ️ ' + project.name + ': 可驗證官方進度仍為 ' + nextProgress + '%')
  }
}

if (!reachablePages) {
  throw new Error('❌ 新北捷運局施工進度頁全部無法讀取，本次停止更新。')
}

if (changed) {
  await fs.writeFile(DATA_PATH, JSON.stringify(projects, null, 2) + '\n')
  console.log('📝 新北捷運資料已產生變更，等待 Pull Request 審核。')
} else {
  console.log('✅ 新北捷運官方資料沒有可安全套用的新變化。')
}
