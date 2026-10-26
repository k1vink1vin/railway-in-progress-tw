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

function findPercent(text, projectName) {
  const escaped = escapeRegex(projectName)
  const patterns = [
    new RegExp(escaped + '[\\s\\S]{0,180}?計畫總進度\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%'),
    new RegExp(escaped + '[\\s\\S]{0,180}?總進度\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%'),
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return Number(match[1])
  }
  return null
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

const targets = [
  { id: 'taoyuan-green', officialName: '捷運綠線' },
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

  if (project.progressPercent !== next) {
    console.log('✅ ' + project.name + ': ' + (project.progressPercent ?? '—') + '% → ' + next + '%')
    project.progressPercent = next
    project.lastCheckedAt = today
    if (target.id === 'taoyuan-green') {
      project.latestUpdate = '計畫總進度' + next.toFixed(2) + '%。'
      project.progressNote = '官方軌道建設進度總覽之計畫總進度。'
    } else {
      project.progressNote = '桃園捷運工程局軌道建設進度總覽同步公布總進度' + next.toFixed(2) + '%；主辦機關為交通部鐵道局。'
    }
    changed = true
  } else {
    console.log('ℹ️ ' + project.name + ': 官方進度仍為 ' + next + '%')
  }
}

if (changed) {
  await fs.writeFile(DATA_PATH, JSON.stringify(raw, null, 2) + '\n')
  console.log('📝 已產生資料變更，等待建立 Pull Request。')
} else {
  console.log('✅ 官方資料無變化，不建立 Pull Request。')
}
