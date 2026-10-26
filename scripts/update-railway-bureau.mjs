import fs from 'node:fs/promises'

const DATA_PATH = new URL('../src/data/projects.json', import.meta.url)

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
}

function rocDateToIso(value) {
  const match = value.match(/(\d{2,3})\/(\d{1,2})\/(\d{1,2})/)
  if (!match) return null
  const year = Number(match[1]) + 1911
  const month = String(Number(match[2])).padStart(2, '0')
  const day = String(Number(match[3])).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function parseProgress(text) {
  const progressMatch = text.match(/目前進度\s*([0-9]+(?:\.[0-9]+)?)\s*%/)
  const dateMatch = text.match(/統計截至日[:：]?\s*(\d{2,3}\/\d{1,2}\/\d{1,2})/)
  if (!progressMatch) return null

  return {
    progress: Number(progressMatch[1]),
    officialUpdatedAt: dateMatch ? rocDateToIso(dateMatch[1]) : null,
  }
}

function validate(project, next) {
  if (!Number.isFinite(next.progress) || next.progress < 0 || next.progress > 100) {
    throw new Error('❌ ' + project.name + ' 抓到不合理的進度：' + next.progress)
  }
  if (typeof project.progressPercent === 'number' && next.progress + 3 < project.progressPercent) {
    throw new Error(
      '❌ ' + project.name + ' 進度由 ' + project.progressPercent + '% 降至 ' + next.progress +
      '%，超過安全門檻，停止更新。'
    )
  }
}

const projects = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'))
const targets = projects.filter((project) =>
  project.agency === '交通部鐵道局' &&
  project.phase === 'construction' &&
  typeof project.progressPercent === 'number' &&
  /^https:\/\/www\.rb\.gov\.tw\/zh-TW\/main\/main_28\//.test(project.source?.url || '')
)

if (!targets.length) {
  throw new Error('❌ 找不到可自動檢查的鐵道局施工計畫。')
}

let changed = false

for (const project of targets) {
  const response = await fetch(project.source.url, {
    headers: {
      'User-Agent': 'railway-in-progress-tw/1.0 (+https://github.com/k1vink1vin/railway-in-progress-tw)',
      'Accept-Language': 'zh-TW,zh;q=0.9',
    },
  })

  if (!response.ok) {
    throw new Error('❌ ' + project.name + ' 官方頁面讀取失敗：HTTP ' + response.status)
  }

  const parsed = parseProgress(stripHtml(await response.text()))
  if (!parsed) {
    throw new Error('❌ 找不到「' + project.name + '」工程進度。官方頁面格式可能已改變，本次不更新。')
  }

  validate(project, parsed)

  const progressChanged = project.progressPercent !== parsed.progress
  const dateChanged =
    parsed.officialUpdatedAt &&
    project.source?.officialUpdatedAt !== parsed.officialUpdatedAt

  if (progressChanged || dateChanged) {
    console.log(
      '✅ ' + project.name + ': ' +
      project.progressPercent + '% → ' + parsed.progress + '%' +
      (parsed.officialUpdatedAt ? '（' + parsed.officialUpdatedAt + '）' : '')
    )

    project.progressPercent = parsed.progress
    project.phase = 'construction'
    project.phaseLabel = '施工中'
    if (parsed.officialUpdatedAt) {
      project.source.officialUpdatedAt = parsed.officialUpdatedAt
      project.progressNote =
        '交通部鐵道局工程進度：目前進度' + parsed.progress.toFixed(2) +
        '%，統計截至' + parsed.officialUpdatedAt + '。'
    } else {
      project.progressNote =
        '交通部鐵道局工程進度：目前進度' + parsed.progress.toFixed(2) + '%。'
    }
    changed = true
  } else {
    console.log('ℹ️ ' + project.name + ': 官方進度仍為 ' + parsed.progress + '%')
  }
}

if (changed) {
  await fs.writeFile(DATA_PATH, JSON.stringify(projects, null, 2) + '\n')
  console.log('📝 鐵道局資料已產生變更，等待 Pull Request 審核。')
} else {
  console.log('✅ 鐵道局官方資料無變化。')
}
