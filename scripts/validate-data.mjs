import fs from 'node:fs/promises'

const PHASES = new Set([
  'feasibility',
  'comprehensive-planning',
  'approved',
  'design',
  'tender',
  'construction',
  'testing',
  'operating',
])
const TYPES = new Set(['metro', 'tra', 'hsr'])

const data = JSON.parse(
  await fs.readFile(new URL('../src/data/projects.json', import.meta.url), 'utf8'),
)

const errors = []
const ids = new Set()

for (const [index, project] of data.entries()) {
  const at = 'projects[' + index + '] ' + (project.name || project.id || '(unknown)')

  if (!project.id || typeof project.id !== 'string') errors.push(at + ': 缺少 id')
  if (ids.has(project.id)) errors.push(at + ': id 重複：' + project.id)
  ids.add(project.id)

  if (!project.name) errors.push(at + ': 缺少 name')
  if (!TYPES.has(project.type)) errors.push(at + ': type 不合法：' + project.type)
  if (!PHASES.has(project.phase)) errors.push(at + ': phase 不合法：' + project.phase)

  if (!/^#[0-9A-Fa-f]{6}$/.test(project.color || '')) {
    errors.push(at + ': color 必須為 #RRGGBB：' + project.color)
  }

  if (project.progressPercent !== undefined) {
    if (
      typeof project.progressPercent !== 'number' ||
      !Number.isFinite(project.progressPercent) ||
      project.progressPercent < 0 ||
      project.progressPercent > 100
    ) {
      errors.push(at + ': progressPercent 必須介於 0–100')
    }
  }

  if (!project.source?.agency || !project.source?.title || !project.source?.url) {
    errors.push(at + ': 缺少官方 source 資訊')
  } else if (!/^https:\/\//.test(project.source.url)) {
    errors.push(at + ': source.url 必須使用 https')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(project.lastCheckedAt || '')) {
    errors.push(at + ': lastCheckedAt 格式必須為 YYYY-MM-DD')
  }
}

if (errors.length) {
  console.error('❌ 鐵道資料驗證失敗：')
  for (const error of errors) console.error(' - ' + error)
  process.exit(1)
}

console.log('✅ 資料驗證通過，共 ' + data.length + ' 項計畫，ID 全部唯一。')
