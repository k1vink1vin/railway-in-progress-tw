import { useEffect, useMemo, useRef, useState } from 'react'
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  MapPinned,
  Network,
  RailSymbol,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  TrainFront,
} from 'lucide-react'
import { projects } from './data/projects'
import type { ProjectPhase, ProjectType, RailwayProject } from './types'

type StageFilter = 'all' | 'planning' | 'design' | 'construction'
type StageGroupKey = Exclude<StageFilter, 'all'>

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

const stageGroups: Array<{
  key: StageGroupKey
  title: string
  subtitle: string
  short: string
}> = [
  {
    key: 'construction',
    title: '施工・測試',
    subtitle: '工程已進入實體建設、系統測試或通車階段',
    short: '施工',
  },
  {
    key: 'design',
    title: '設計・招標',
    subtitle: '核定後進入設計、招標與開工準備',
    short: '設計',
  },
  {
    key: 'planning',
    title: '規劃・審議',
    subtitle: '可行性研究、綜合規劃與中央審議階段',
    short: '規劃',
  },
]

function stageGroupFor(project: RailwayProject): StageGroupKey {
  if (stageMap.construction.includes(project.phase)) return 'construction'
  if (stageMap.design.includes(project.phase)) return 'design'
  return 'planning'
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

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(reduceMotion ? value : 0)

  useEffect(() => {
    if (!isInView || reduceMotion) {
      if (reduceMotion) setDisplay(value)
      return
    }

    const controls = animate(0, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(latest),
    })

    return () => controls.stop()
  }, [isInView, reduceMotion, value])

  return <span ref={ref}>{display.toFixed(2)}%</span>
}

function ScrollRail() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.4,
  })
  const trainY = useTransform(smoothProgress, [0, 1], ['0%', 'calc(100% - 28px)'])
  const trainX = useTransform(smoothProgress, [0, 1], ['0%', 'calc(100% - 28px)'])

  if (reduceMotion) return null

  return (
    <>
      <div className="scroll-rail scroll-rail-desktop" aria-hidden="true">
        <div className="rail-line rail-line-vertical" />
        <motion.div className="rail-progress rail-progress-vertical" style={{ scaleY: smoothProgress }} />
        <motion.div className="scroll-train scroll-train-vertical" style={{ y: trainY }}>
          <TrainFront size={15} />
        </motion.div>
        <span className="rail-station rail-station-a" />
        <span className="rail-station rail-station-b" />
        <span className="rail-station rail-station-c" />
      </div>

      <div className="scroll-rail scroll-rail-mobile" aria-hidden="true">
        <div className="rail-line rail-line-horizontal" />
        <motion.div className="rail-progress rail-progress-horizontal" style={{ scaleX: smoothProgress }} />
        <motion.div className="scroll-train scroll-train-horizontal" style={{ x: trainX }}>
          <TrainFront size={13} />
        </motion.div>
      </div>
    </>
  )
}

function DeckNavigation() {
  return (
    <nav className="deck-nav" aria-label="簡報章節導覽">
      {[
        ['overview', '01', '總覽'],
        ['vision', '02', '建設願景'],
        ['focus', '03', '重點工程'],
        ['projects', '04', '進度監測'],
      ].map(([id, number, label]) => (
        <a key={id} href={`#${id}`} title={label}>
          <span>{number}</span>
          <i />
          <strong>{label}</strong>
        </a>
      ))}
    </nav>
  )
}

function CompactPhase({ project }: { project: RailwayProject }) {
  const currentIndex = phaseOrder.indexOf(project.phase)

  return (
    <div className="compact-phase" aria-label={`目前階段：${project.phaseLabel}`}>
      <div className="stage-segments">
        {phaseOrder.map((phase, index) => (
          <motion.span
            key={phase}
            className={[
              index < currentIndex ? 'done' : '',
              index === currentIndex ? 'current' : '',
            ].join(' ')}
            title={phaseShort[phase]}
            initial={{ scaleX: 0.25, opacity: 0.45 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ delay: index * 0.035, duration: 0.25 }}
          />
        ))}
      </div>
      <span className="stage-current">{project.phaseLabel}</span>
    </div>
  )
}

function StageStationHeader({
  title,
  subtitle,
  short,
  count,
}: {
  title: string
  subtitle: string
  short: string
  count: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="stage-station"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="stage-station-sign">
        <span className="station-dot" />
        <span className="station-short">{short}</span>
        <strong>{title}</strong>
        <span className="station-count">{count}</span>
      </div>
      <span className="stage-station-subtitle">{subtitle}</span>
      <span className="station-track" aria-hidden="true"><i /><i /><i /></span>
    </motion.div>
  )
}

function FeaturedProject({ project, rank }: { project: RailwayProject; rank: number }) {
  return (
    <motion.article
      className="featured-project"
      style={{ '--route-color': project.color } as React.CSSProperties}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{ delay: rank * 0.08, duration: 0.45 }}
    >
      <div className="featured-scan" />
      <div className="featured-topline">
        <span>0{rank + 1}</span>
        <span>{typeMeta[project.type].label} · {project.region}</span>
      </div>
      <h3>{project.name}</h3>
      <div className="featured-progress">
        <strong><CountUp value={project.progressPercent ?? 0} /></strong>
        <span>官方工程進度</span>
      </div>
      <div className="featured-track">
        <motion.i
          initial={{ width: 0 }}
          whileInView={{ width: `${project.progressPercent ?? 0}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
      <p>{project.latestUpdate}</p>
      <a href={project.source.url} target="_blank" rel="noreferrer">
        查看官方來源 <ArrowUpRight size={15} />
      </a>
    </motion.article>
  )
}

function ProjectRow({ project, index }: { project: RailwayProject; index: number }) {
  const reduceMotion = useReducedMotion()
  const entryX = reduceMotion ? 0 : index % 2 === 0 ? -18 : 18

  return (
    <motion.article
      layout
      className="project-row"
      initial={reduceMotion ? false : { opacity: 0, x: entryX, scale: 0.992 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35, margin: '0px 0px -6% 0px' }}
      whileHover={reduceMotion ? undefined : { x: 3 }}
      transition={{
        layout: { type: 'spring', stiffness: 320, damping: 30 },
        opacity: { duration: 0.28 },
        x: { type: 'spring', stiffness: 300, damping: 26 },
        scale: { duration: 0.28 },
      }}
      style={{ '--route-color': project.color } as React.CSSProperties}
    >
      <motion.div
        className="route-stripe"
        initial={reduceMotion ? false : { scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
      />

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
              <span className="progress-value"><CountUp value={project.progressPercent} /></span>
              <span className="progress-source">官方進度</span>
            </div>
            <div className="compact-progress-track">
              <motion.div
                className="compact-progress-fill"
                initial={reduceMotion ? false : { width: 0 }}
                whileInView={{ width: `${project.progressPercent}%` }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ duration: 0.78, ease: 'easeOut' }}
              />
              {project.progressPercent >= 85 && (
                <motion.span
                  className="near-finish-glow"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: [0, 0.9, 0.35] }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, delay: 0.45 }}
                />
              )}
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

  const grouped = useMemo(() => {
    return stageGroups
      .map((group) => ({
        ...group,
        projects: filtered.filter((project) => stageGroupFor(project) === group.key),
      }))
      .filter((group) => group.projects.length > 0)
  }, [filtered])

  const featured = useMemo(
    () =>
      projects
        .filter((project) => project.phase === 'construction' && typeof project.progressPercent === 'number')
        .sort((a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0))
        .slice(0, 3),
    [],
  )

  const stats = useMemo(() => {
    const active = projects.filter((project) => project.phase !== 'operating').length
    const construction = projects.filter((project) => project.phase === 'construction').length
    const withProgress = projects.filter((project) => typeof project.progressPercent === 'number').length
    const planning = projects.filter((project) => stageGroupFor(project) === 'planning').length
    return { total: projects.length, active, construction, withProgress, planning }
  }, [])

  return (
    <main>
      <ScrollRail />
      <DeckNavigation />

      <section className="hero deck-slide" id="overview">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-route hero-route-one" aria-hidden="true" />
        <div className="hero-route hero-route-two" aria-hidden="true" />

        <nav className="topbar">
          <a className="brand" href="./">
            <span className="brand-icon"><RailSymbol size={20} /></span>
            <span>鐵道進行式</span>
          </a>
          <div className="topbar-status">
            <span className="live-dot" />
            <span>OFFICIAL DATA MONITOR</span>
          </div>
          <span className="unofficial">非官方整理網站</span>
        </nav>

        <div className="slide-index" aria-hidden="true"><span>01</span><i /> OVERVIEW</div>

        <div className="hero-policy">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48 }}
          >
            <div className="hero-kicker"><Sparkles size={15} /> TAIWAN RAIL DEVELOPMENT 2026</div>
            <h1>下一站，<br /><span>正在成形。</span></h1>
            <p className="hero-lead">
              從都會捷運、臺鐵立體化到高鐵延伸，持續追蹤台灣正在推進的軌道建設，
              用公開資料看見交通網路如何一步步連起城市與生活。
            </p>

            <div className="hero-actions">
              <a className="primary-action" href="#projects">
                查看建設進度 <ArrowDown size={16} />
              </a>
              <span className="trust-note"><ShieldCheck size={15} /> 官方來源優先・不自行估算進度</span>
            </div>
          </motion.div>

          <motion.div
            className="command-panel"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.55 }}
          >
            <div className="command-head">
              <span><Activity size={15} /> NATIONAL RAIL PULSE</span>
              <span className="command-state">LIVE</span>
            </div>
            <div className="command-main">
              <strong>{stats.construction}</strong>
              <span>項工程施工中</span>
            </div>
            <div className="command-bars">
              <i style={{ '--bar': '92%' } as React.CSSProperties} />
              <i style={{ '--bar': '68%' } as React.CSSProperties} />
              <i style={{ '--bar': '81%' } as React.CSSProperties} />
              <i style={{ '--bar': '54%' } as React.CSSProperties} />
              <i style={{ '--bar': '73%' } as React.CSSProperties} />
              <i style={{ '--bar': '88%' } as React.CSSProperties} />
            </div>
            <div className="command-stats">
              <div><span>TRACKED</span><strong>{stats.total}</strong></div>
              <div><span>OFFICIAL %</span><strong>{stats.withProgress}</strong></div>
              <div><span>PLANNING</span><strong>{stats.planning}</strong></div>
            </div>
            <div className="command-network" aria-hidden="true">
              <span /><span /><span /><span /><span />
            </div>
          </motion.div>
        </div>

        <div className="stats-grid">
          {[
            [stats.total, '收錄計畫'],
            [stats.active, '持續推動'],
            [stats.construction, '施工階段'],
            [stats.withProgress, '官方百分比'],
          ].map(([value, label], index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.055 }}
            >
              <strong>{value}</strong><span>{label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="policy-section deck-slide" id="vision">
        <div className="slide-index slide-index-dark" aria-hidden="true"><span>02</span><i /> VISION</div>
        <div className="policy-intro">
          <span className="section-kicker">WHY RAIL MATTERS</span>
          <h2>建設的不只是路線，<br />而是下一階段的城市連結。</h2>
          <p>
            軌道建設牽動通勤時間、都市發展、區域均衡與公共運輸選擇。
            本站把分散在各主管機關的工程資訊整理成可追蹤的進度脈絡。
          </p>
        </div>

        <div className="policy-pillars">
          <motion.article initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span><Network size={20} /></span>
            <strong>區域連結</strong>
            <p>跨縣市、跨運具的路網逐步銜接，讓生活圈不再只由行政區界線決定。</p>
          </motion.article>
          <motion.article initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .07 }}>
            <span><Route size={20} /></span>
            <strong>通勤升級</strong>
            <p>新線、延伸線與鐵路立體化，持續改善容量、轉乘與都市交通效率。</p>
          </motion.article>
          <motion.article initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .14 }}>
            <span><ShieldCheck size={20} /></span>
            <strong>資訊透明</strong>
            <p>只使用可追溯官方資訊；有百分比就顯示百分比，沒有就忠實呈現行政階段。</p>
          </motion.article>
        </div>
      </section>

      <section className="featured-section deck-slide" id="focus">
        <div className="slide-index slide-index-dark" aria-hidden="true"><span>03</span><i /> PROJECTS IN FOCUS</div>
        <div className="featured-heading">
          <div>
            <span className="section-kicker">PROJECTS IN FOCUS</span>
            <h2>接近完工的重點工程</h2>
          </div>
          <p>依主管機關公布的整體工程進度排序。</p>
        </div>
        <div className="featured-grid">
          {featured.map((project, index) => (
            <FeaturedProject key={project.id} project={project} rank={index} />
          ))}
        </div>
      </section>

      <section className="content deck-slide deck-slide-projects" id="projects">
        <div className="slide-index slide-index-dark" aria-hidden="true"><span>04</span><i /> PROJECT MONITOR</div>
        <div className="board-intro">
          <div>
            <span className="section-kicker">PROJECT MONITOR</span>
            <h2>全台軌道建設進度</h2>
            <p>從最接近完工的工程一路看到規劃中的下一代路網。</p>
          </div>
          <div className="result-summary">
            <strong>{filtered.length}</strong> / {projects.length}
            <span>依接近完工程度排列</span>
          </div>
        </div>

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

        <div className="project-list-head" aria-hidden="true">
          <span>計畫</span>
          <span>階段</span>
          <span>進度</span>
          <span>最新資訊</span>
          <span />
        </div>

        <motion.div className="stage-groups" layout>
          {grouped.map((group) => (
            <section className="stage-group" key={group.key}>
              <StageStationHeader
                title={group.title}
                subtitle={group.subtitle}
                short={group.short}
                count={group.projects.length}
              />

              <motion.div className="project-list" layout>
                {group.projects.map((project, index) => (
                  <ProjectRow key={project.id} project={project} index={index} />
                ))}
              </motion.div>
            </section>
          ))}
        </motion.div>

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
        <div>
          <strong>鐵道進行式</strong>
          <span>TAIWAN RAIL PROJECTS</span>
        </div>
        <span>非官方整理網站 · 資料以各主管機關最新公告為準</span>
      </footer>
    </main>
  )
}

export default App
