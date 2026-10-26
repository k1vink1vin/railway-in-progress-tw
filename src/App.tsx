import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPinned,
  RailSymbol,
  Search,
  Sparkles,
  TrainFront,
} from 'lucide-react'
import { projects } from './data/projects'
import type { ProjectPhase, ProjectType, RailwayProject } from './types'

type StageFilter = 'all' | 'planning' | 'design' | 'construction'

const phaseOrder: ProjectPhase[] = [
  'feasibility',
  'comprehensive-planning',
  'approved',
  'design',
  'tender',
  'construction',
  'testing',
  'operating',
]

const phaseShort: Record<ProjectPhase, string> = {
  feasibility: '可研',
  'comprehensive-planning': '綜規',
  approved: '核定',
  design: '設計',
  tender: '招標',
  construction: '施工',
  testing: '測試',
  operating: '通車',
}

const typeMeta: Record<ProjectType, { label: string; emoji: string }> = {
  metro: { label: '捷運', emoji: '🚇' },
  tra: { label: '臺鐵', emoji: '🚆' },
  hsr: { label: '高鐵', emoji: '🚄' },
}

const stageMap: Record<StageFilter, ProjectPhase[]> = {
  all: phaseOrder,
  planning: ['feasibility', 'comprehensive-planning'],
  design: ['approved', 'design', 'tender'],
  construction: ['construction', 'testing', 'operating'],
}

const completionRank: Record<ProjectPhase, number> = {
  feasibility: 10,
  'comprehensive-planning': 20,
  approved: 30,
  design: 40,
  tender: 50,
  construction: 60,
  testing: 80,
  operating: 100,
}

function compareByCompletion(a: RailwayProject, b: RailwayProject) {
  if (a.phase === 'operating' || b.phase === 'operating') {
    return completionRank[b.phase] - completionRank[a.phase]
  }

  if (a.phase === 'testing' || b.phase === 'testing') {
    return completionRank[b.phase] - completionRank[a.phase]
  }

  if (a.phase === 'construction' && b.phase === 'construction') {
    const aHasProgress = typeof a.progressPercent === 'number'
    const bHasProgress = typeof b.progressPercent === 'number'

    if (aHasProgress && bHasProgress) {
      if (b.progressPercent !== a.progressPercent) {
        return b.progressPercent! - a.progressPercent!
      }
    } else if (aHasProgress !== bHasProgress) {
      return aHasProgress ? -1 : 1
    }
  }

  const phaseDiff = completionRank[b.phase] - completionRank[a.phase]
  if (phaseDiff !== 0) return phaseDiff

  if (typeof a.progressPercent === 'number' || typeof b.progressPercent === 'number') {
    return (b.progressPercent ?? -1) - (a.progressPercent ?? -1)
  }

  return a.name.localeCompare(b.name, 'zh-Hant')
}

function ProjectCard({ project }: { project: RailwayProject }) {
  const currentIndex = phaseOrder.indexOf(project.phase)

  return (
    <motion.article
      className="project-card"
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      style={{ '--route-color': project.color } as React.CSSProperties}
    >
      <div className="route-stripe" />
      <div className="card-head">
        <div>
          <div className="eyebrow">
            <span>{typeMeta[project.type].emoji} {typeMeta[project.type].label}</span>
            <span>·</span>
            <span>{project.region}</span>
          </div>
          <h3>{project.name}</h3>
        </div>
        <span className="phase-badge">{project.phaseLabel}</span>
      </div>

      <p className="latest-update">{project.latestUpdate}</p>

      {typeof project.progressPercent === 'number' ? (
        <div className="progress-block" aria-label={`官方進度 ${project.progressPercent}%`}>
          <div className="progress-label-row">
            <span>官方公布進度</span>
            <strong>{project.progressPercent.toFixed(2)}%</strong>
          </div>
          <div className="progress-track">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${project.progressPercent}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            <motion.div
              className="train-marker"
              initial={{ left: 0 }}
              animate={{ left: `calc(${project.progressPercent}% - 14px)` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            >
              <TrainFront size={17} />
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="phase-track" aria-label={`目前階段：${project.phaseLabel}`}>
          {phaseOrder.map((phase, index) => (
            <div className="phase-step" key={phase}>
              <span
                className={[
                  'phase-dot',
                  index < currentIndex ? 'done' : '',
                  index === currentIndex ? 'current' : '',
                ].join(' ')}
              >
                {index < currentIndex ? <CheckCircle2 size={14} /> : index + 1}
              </span>
              <small>{phaseShort[phase]}</small>
            </div>
          ))}
        </div>
      )}

      <p className="progress-note">{project.progressNote}</p>

      <div className="card-meta">
        <span><CalendarDays size={15} /> 檢查：{project.lastCheckedAt}</span>
        {project.expectedCompletion && (
          <span><Clock3 size={15} /> 目標：{project.expectedCompletion}</span>
        )}
      </div>

      <div className="card-footer">
        <span className="agency">{project.agency}</span>
        <a href={project.source.url} target="_blank" rel="noreferrer">
          官方來源 <ArrowUpRight size={15} />
        </a>
      </div>
    </motion.article>
  )
}

function App() {
  const [filter, setFilter] = useState<'all' | ProjectType>('all')
  const [stageFilter, setStageFilter] = useState<StageFilter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-Hant')
    return projects
      .filter((project) => {
        const typeMatched = filter === 'all' || project.type === filter
        const stageMatched = stageMap[stageFilter].includes(project.phase)
        const keywordMatched =
          !keyword ||
          [project.name, project.region, project.agency, project.phaseLabel]
            .join(' ')
            .toLocaleLowerCase('zh-Hant')
            .includes(keyword)
        return typeMatched && stageMatched && keywordMatched
      })
      .sort(compareByCompletion)
  }, [filter, stageFilter, query])

  const stats = useMemo(() => {
    const active = projects.filter((project) => project.phase !== 'operating').length
    const construction = projects.filter((project) => project.phase === 'construction').length
    const planning = projects.filter((project) =>
      ['feasibility', 'comprehensive-planning', 'approved', 'design', 'tender'].includes(project.phase),
    ).length
    return { total: projects.length, active, construction, planning }
  }, [])

  return (
    <main>
      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <nav className="topbar">
          <a className="brand" href="./">
            <span className="brand-icon"><RailSymbol size={21} /></span>
            <span>鐵道進行式</span>
          </a>
          <span className="unofficial">非官方整理網站</span>
        </nav>

        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="hero-kicker"><Sparkles size={16} /> Taiwan Rail Projects</div>
            <h1>看見台灣下一條鐵路，<br /><span>正在走到哪一步。</span></h1>
            <p>
              把散落在捷運工程局與交通部鐵道局的官方資訊，
              整理成一眼就看懂的建設進度。
            </p>
          </motion.div>

          <motion.div
            className="mini-map-card"
            initial={{ opacity: 0, rotate: 2, x: 12 }}
            animate={{ opacity: 1, rotate: 0, x: 0 }}
            transition={{ delay: 0.12, duration: 0.55 }}
          >
            <MapPinned size={26} />
            <strong>資料來源</strong>
            <span>六都捷運工程專責機關</span>
            <span>＋ 交通部鐵道局</span>
            <div className="mini-route">
              <i /><i /><i /><i /><i />
            </div>
          </motion.div>
        </div>

        <div className="stats-grid">
          <div><strong>{stats.total}</strong><span>目前收錄</span></div>
          <div><strong>{stats.active}</strong><span>推動中</span></div>
          <div><strong>{stats.construction}</strong><span>施工階段</span></div>
          <div><strong>{stats.planning}</strong><span>規劃／設計</span></div>
        </div>
      </section>

      <section className="content">
        <div className="section-head">
          <div>
            <span className="section-kicker">PROJECT BOARD</span>
            <h2>全台軌道建設進度</h2>
            <p>有官方百分比就顯示百分比；沒有的計畫只呈現可驗證的行政／工程階段。</p>
          </div>
        </div>

        <div className="filter-panel">
          <label className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋路線、地區或主管機關"
              aria-label="搜尋鐵道建設計畫"
            />
          </label>

          <div className="filter-stack">
            <div className="filters" role="group" aria-label="依鐵路類型篩選">
              {([
                ['all', '全部'],
                ['metro', '🚇 捷運'],
                ['tra', '🚆 臺鐵'],
                ['hsr', '🚄 高鐵'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? 'active' : ''}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="filters filters-secondary" role="group" aria-label="依建設階段篩選">
              {([
                ['all', '所有階段'],
                ['planning', '規劃／審議'],
                ['design', '設計／招標'],
                ['construction', '施工／通車'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  className={stageFilter === value ? 'active' : ''}
                  onClick={() => setStageFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="result-summary">
          顯示 <strong>{filtered.length}</strong> / {projects.length} 項計畫
          <span className="sort-hint">依接近完工程度排列 · 施工中有官方％者由高到低</span>
        </div>

        <div className="project-grid">
          {filtered.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 10) * 0.035 }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <RailSymbol size={28} />
            <strong>找不到符合條件的計畫</strong>
            <span>試著清除搜尋文字或切換篩選條件。</span>
          </div>
        )}

        <aside className="method-card">
          <div className="method-icon"><RailSymbol size={24} /></div>
          <div>
            <h3>進度怎麼算？</h3>
            <p>
              本站不自行估算工程百分比。只有主管機關明確公布數字時才顯示百分比；
              其他計畫依可行性研究、綜合規劃、核定、設計、招標、施工、測試與通車呈現。
            </p>
          </div>
        </aside>
      </section>

      <footer>
        <strong>鐵道進行式</strong>
        <span>資料以各主管機關最新公告為準 · GitHub Pages</span>
      </footer>
    </main>
  )
}

export default App
