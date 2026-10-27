import fs from 'node:fs/promises'

const DATA_PATH = new URL('../src/data/projects.json', import.meta.url)
const SOURCE_URL = 'https://dorts.tycg.gov.tw/cp.aspx?n=23173'

function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
}

function taipeiDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function escapeRegex(value) {
  return value.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
}

function rocDateToIso(value) {
  const match = value.match(/(\d{2,3})[-\/.](\d{1,2})[-\/.](\d{1,2})/)
  if (!match) return null
  const year = Number(match[1]) + 1911
  const month = String(Number(match[2])).padStart(2, '0')
  const day = String(Number(match[3])).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function findPercent(text, projectName) {
  const escaped = escapeRegex(projectName)
  const patterns = [
    new RegExp(escaped + '[\\s\\S]{0,220}?計畫總進度\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%'),
    new RegExp(escaped + '[\\s\\S]{0,220}?總進度\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%'),
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return Number(match[1])
  }
  return null
}

function findPageUpdatedAt(text) {
  const match = text.match(/更新日期\s*(\d{2,3}[-\/.]\d{1,2}[-\/.]\d{1,2})/)
  return match ? rocDateToIso(match[1]) : null
}

function validatePercent(id, next, previous) {
  if (!Number.isFinite(next) || next < 0 || next > 100) {
    throw new Error('❌ ' + id + ' 抓到不合理的進度：' + next)
  }
  if (typeof previous === 'number' && next + 3 < previous) {
    throw new Error('❌ ' + id + ' 進度由 ' + previous + '% 降至 ' + next + '%，超過安全門檻，停止更新。')
  }
}

const response = await fetch(SOURCE_URL, {
  headers: {
    'User-Agent': 'railway-in-progress-tw/1.0 (+https://github.com/k1vink1vin/railway-in-progress-tw)',
    'Accept-Language': 'zh-TW,zh;q=0.9',
  },
})
if (!response.ok) {
  throw new Error('❌ 桃園捷運局頁面讀取失敗：HTTP ' + response.status)
}

const text = cleanHtml(await response.text())
const raw = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'))
const today = taipeiDate()
const officialUpdatedAt = findPageUpdatedAt(text)

const targets = [
  { id: 'taoyuan-green', officialName: '捷運綠線' },
  { id: 'taoyuan-brown', officialName: '捷運棕線' },
  { id: 'taoyuan-green-zhongli', officialName: '捷運綠線延伸中壢' },
  { id: 'tra-taoyuan-underground', officialName: '桃園鐵路地下化' },
]

let changed = false

for (const target of targets) {
  const project = raw.find((item) => item.id === target.id)
  if (!project) throw new Error('❌ 找不到資料項目：' + target.id)

  const next = findPercent(text, target.officialName)
  if (next === null) {
    throw new Error('❌ 找不到「' + target.officialName + '」官方百分比。官方頁面格式可能已改變，本次不更新。')
  }

  validatePercent(target.id, next, project.progressPercent)

  const progressChanged = project.progressPercent !== next
  const dateChanged =
    officialUpdatedAt &&
    project.source?.officialUpdatedAt !== officialUpdatedAt

  if (progressChanged || dateChanged) {
    console.log(
      '✅ ' + project.name + ': ' + (project.progressPercent ?? '—') + '% → ' + next + '%' +
      (officialUpdatedAt ? '（頁面更新 ' + officialUpdatedAt + '）' : '')
    )

    project.progressPercent = next
    project.lastCheckedAt = today

    if (!project.source || project.source.url !== SOURCE_URL) {
      project.source = {
        agency: target.id === 'tra-taoyuan-underground' ? '交通部鐵道局' : '桃園市政府捷運工程局',
        title: '軌道建設進度總覽',
        url: SOURCE_URL,
      }
    }

    if (officialUpdatedAt) {
      project.source.officialUpdatedAt = officialUpdatedAt
    }

    if (target.id === 'tra-taoyuan-underground') {
      project.progressNote =
        '桃園市政府捷運工程局「軌道建設進度總覽」同步公布計畫總進度' +
        next.toFixed(2) + '%；主辦機關為交通部鐵道局。'
      project.latestUpdate = '桃園鐵路地下化整體工程進度' + next.toFixed(2) + '%。'
    } else {
      project.progressNote =
        '桃園市政府捷運工程局「軌道建設進度總覽」公布計畫總進度' +
        next.toFixed(2) + '%。'

      if (target.id === 'taoyuan-brown') {
        project.latestUpdate =
          'BRM01標機電系統統包工程已決標；計畫總進度' + next.toFixed(2) + '%。'
      } else if (target.id === 'taoyuan-green-zhongli') {
        project.latestUpdate =
          'GEC04標土建統包工程已開工；計畫總進度' + next.toFixed(2) + '%。'
      } else {
        project.latestUpdate = '計畫總進度' + next.toFixed(2) + '%。'
      }
    }

    changed = true
  } else {
    console.log('ℹ️ ' + project.name + ': 官方進度仍為 ' + next + '%')
  }
}

if (changed) {
  await fs.writeFile(DATA_PATH, JSON.stringify(raw, null, 2) + '\n')
  console.log('📝 已產生桃園官方資料變更，等待建立 Pull Request。')
} else {
  console.log('✅ 桃園官方資料無變化，不建立 Pull Request。')
}
