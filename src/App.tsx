import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  CalendarDays,
  MapPinned,
  RailSymbol,
  Search,
  Sparkles,
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

    if (aHasProgress && bHasProgress && b.progressPercent !== a.progressPercent) {
      return b.progressPercent! - a.progressPercent!
    }

    if (aHasProgress !== bHasProgress) {
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

function CompactPhase({ project }: { project: RailwayProject }) {
  const currentIndex = phaseOrder.indexOf(project.phase)

  return (
    <div className="compact-phase" aria-label={`目前階段：${project.phaseLabel}`}>
      <div className="stage-segments">
        {phaseOrder.map((phase, index) => (
          <span
            key={phase}
            className={[
              index < currentIndex ? 'done' : '',
              index === currentIndex ? 'current' : '',
            ].join(' ')}
            title={phaseShort[phase]}
          />
        ))}
      </div>
      <span className="stage-current">{project.phaseLabel}</span>
    </div>
  )
}

function ProjectRow({ project }: { project: RailwayProject }) {
  return (
    <motion.article
      className="project-row"
      whileHover={{ x: 3 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      style={{ '--route-color': project.color } as React.CSSProperties}
    >
      <div className="route-stripe" />

      <div className="project-main">
        <div className="project-title-line">
          <span className="type-chip">{typeMeta[project.type].emoji} {typeMeta[project.type].label}</span>
          <h3>{project.name}</h3>
        </div>
        <div className="project-subline">
          <span>{project.region}</span>
          <span>·</span>
          <span>{project.agency}</span>
        </div>
      </div>

      <div className="project-stage">
        <span className="phase-badge">{project.phaseLabel}</span>
      </div>

      <div className="project-progress">
        {typeof project.progressPercent === 'number' ? (
          <div className="compact-progress" aria-label={`官方進度 ${project.progressPercent}%`}>
            <div className="compact-progress-top">
              <span className="progress-value">{project.progressPercent.toFixed(2)}%</span>
              <span className="progress-source">官方進度</span>
            </div>
            <div className="compact-progress-track">
              <motion.div
                className="compact-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${project.progressPercent}%` }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
              />
            </div>
          </div>
        ) : (
          <CompactPhase project={project} />
        )}
      </div>

      <div className="project-update">
        <span className="update-text">{project.latestUpdate}</span>
        <span className="update-date"><CalendarDays size={13} /> {project.lastCheckedAt}</span>
      </div>

      <a
        className="source-link"
        href={project.source.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`開啟 ${project.name} 官方來源`}
        title={project.source.title}
      >
        <ArrowUpRight size={17} />
        <span>來源</span>
      </a>
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
    const withProgress = projects.filter((project) => typeof project.progressPercent === 'number').length
    return { total: projects.length, active, construction, withProgress }
  }, [])

  return (
    <main>
      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <nav className="topbar">
          <a className="brand" href="./">
            <span className="brand-icon"><RailSymbol size={20} /></span>
            <span>鐵道進行式</span>
          </a>
          <span className="unofficial">非官方整理網站</span>
        </nav>

        <div className="hero-compact">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="hero-kicker"><Sparkles size={15} /> Taiwan Rail Projects</div>
            <h1>台灣鐵道建設，<span>一眼看進度。</span></h1>
            <p>六都捷運工程機關＋交通部鐵道局官方資料整合。</p>
          </motion.div>

          <div className="hero-source">
            <MapPinned size={18} />
            <span>官方來源優先</span>
          </div>
        </div>

        <div className="stats-grid">
          <div><strong>{stats.total}</strong><span>收錄計畫</span></div>
          <div><strong>{stats.active}</strong><span>推動中</span></div>
          <div><strong>{stats.construction}</strong><span>施工中</span></div>
          <div><strong>{stats.withProgress}</strong><span>有官方％</span></div>
        </div>
      </section>

      <section className="content">
        <div className="toolbar">
          <label className="search-box">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋路線、地區、主管機關"
              aria-label="搜尋鐵道建設計畫"
            />
          </label>

          <div className="filter-groups">
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
                ['planning', '規劃'],
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

        <div className="list-heading">
          <div>
            <span className="section-kicker">PROJECT BOARD</span>
            <h2>全台軌道建設進度</h2>
          </div>
          <div className="result-summary">
            <strong>{filtered.length}</strong> / {projects.length}
            <span>依接近完工程度排列</span>
          </div>
        </div>

        <div className="project-list-head" aria-hidden="true">
          <span>計畫</span>
          <span>階段</span>
          <span>進度</span>
          <span>最新資訊</span>
          <span />
        </div>

        <div className="project-list">
          {filtered.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 8) * 0.025 }}
            >
              <ProjectRow project={project} />
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
          <div className="method-icon"><RailSymbol size={21} /></div>
          <p>
            只有主管機關明確公布整體百分比時才顯示％；其餘以可研、綜規、核定、設計、招標、施工、測試與通車階段呈現。
          </p>
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
