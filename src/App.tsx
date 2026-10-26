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
  ChevronLeft,
  ChevronRight,
  RailSymbol,
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

const phaseLong: Record<ProjectPhase, string> = {
  feasibility: '可行性研究',
  'comprehensive-planning': '綜合規劃',
  approved: '計畫核定',
  design: '設計',
  tender: '招標',
  construction: '施工',
  testing: '測試／試運轉',
  operating: '通車營運',
}

const typeMeta: Record<ProjectType, { label: string; code: string }> = {
  metro: { label: '捷運', code: 'MRT' },
  tra: { label: '臺鐵', code: 'TRA' },
  hsr: { label: '高鐵', code: 'HSR' },
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
    subtitle: '已經在蓋、測試，或接近通車的工程',
    short: '施工',
  },
  {
    key: 'design',
    title: '核定・設計・招標',
    subtitle: '計畫已往開工方向前進，但還沒進入主要施工',
    short: '設計',
  },
  {
    key: 'planning',
    title: '可研・綜規',
    subtitle: '還在研究、規劃或審議中的下一批路線',
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

function CountUp({ value, decimals = 2 }: { value: number; decimals?: number }) {
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

  return <span ref={ref}>{display.toFixed(decimals)}</span>
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
    <nav className="deck-nav" aria-label="章節導覽">
      {[
        ['overview', '01', '首頁'],
        ['vision', '02', '怎麼看'],
        ['snapshot', '03', '現在'],
        ['focus', '04', '快完工'],
        ['projects', '05', '全部工程'],
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
            title={phaseLong[phase]}
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
          <span className="type-chip" title={typeMeta[project.type].label}>{typeMeta[project.type].code}</span>
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
              <span className="progress-value"><CountUp value={project.progressPercent} />%</span>
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
  const [spotlightIndex, setSpotlightIndex] = useState(0)

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
    const construction = projects.filter((project) => project.phase === 'construction').length
    const withProgress = projects.filter((project) => typeof project.progressPercent === 'number').length
    const planning = projects.filter((project) => stageGroupFor(project) === 'planning').length
    return { total: projects.length, construction, withProgress, planning }
  }, [])

  const spotlight = featured[spotlightIndex]

  const moveSpotlight = (direction: number) => {
    if (!featured.length) return
    setSpotlightIndex((current) => (current + direction + featured.length) % featured.length)
  }

  return (
    <main>
      <ScrollRail />
      <DeckNavigation />

      <section className="hero deck-slide" id="overview">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow hero-glow-one" />
        <div className="hero-route hero-route-one" aria-hidden="true" />

        <nav className="topbar">
          <a className="brand" href="./">
            <span className="brand-icon"><RailSymbol size={20} /></span>
            <span>鐵道進行式</span>
          </a>
          <div className="topbar-status">
            <span className="live-dot" />
            <span>OFFICIAL DATA TRACKER</span>
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
            <div className="hero-kicker"><Sparkles size={15} /> TAIWAN RAIL PROJECT TRACKER</div>
            <h1>台灣鐵道，<br /><span>現在蓋到哪？</span></h1>
            <p className="hero-lead">
              捷運、臺鐵、高鐵的工程資訊常常散在不同網站。
              這裡把它們整理在一起，讓你快速看到哪些快完工、哪些正在施工、哪些還在規劃。
            </p>

            <div className="hero-actions">
              <a className="primary-action" href="#projects">
                直接看進度 <ArrowDown size={16} />
              </a>
              <span className="trust-note"><ShieldCheck size={15} /> 官方來源優先・不自己猜進度</span>
            </div>
          </motion.div>

          <motion.div
            className="command-panel command-panel-simple"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.55 }}
          >
            <div className="command-head">
              <span><Activity size={15} /> TRACKER STATUS</span>
              <span className="command-state">LIVE</span>
            </div>
            <div className="command-main">
              <strong>{stats.total}</strong>
              <span>項計畫持續追蹤</span>
            </div>
            <div className="command-bars">
              <i style={{ '--bar': '44%' } as React.CSSProperties} />
              <i style={{ '--bar': '68%' } as React.CSSProperties} />
              <i style={{ '--bar': '53%' } as React.CSSProperties} />
              <i style={{ '--bar': '84%' } as React.CSSProperties} />
              <i style={{ '--bar': '62%' } as React.CSSProperties} />
              <i style={{ '--bar': '76%' } as React.CSSProperties} />
            </div>
            <div className="command-stats">
              <div><span>施工中</span><strong>{stats.construction}</strong></div>
              <div><span>有官方％</span><strong>{stats.withProgress}</strong></div>
              <div><span>規劃中</span><strong>{stats.planning}</strong></div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="phase-story-section deck-slide" id="vision">
        <div className="slide-index slide-index-dark" aria-hidden="true"><span>02</span><i /> HOW TO READ</div>
        <div className="phase-story-copy">
          <span className="section-kicker">HOW TO READ THE TRACKER</span>
          <h2>一條鐵路，<br />通常會走過這 8 站。</h2>
          <p>
            有些工程會公布整體進度百分比，有些不會。
            沒有官方百分比時，我們就只顯示它目前走到哪個階段，不自己換算。
          </p>
        </div>

        <div className="phase-story-track">
          {phaseOrder.map((phase, index) => (
            <motion.div
              className="phase-story-stop"
              key={phase}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ delay: index * 0.055 }}
            >
              <span className="phase-story-number">{String(index + 1).padStart(2, '0')}</span>
              <i />
              <strong>{phaseShort[phase]}</strong>
              <small>{phaseLong[phase]}</small>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="snapshot-section deck-slide" id="snapshot">
        <div className="slide-index slide-index-dark" aria-hidden="true"><span>03</span><i /> RIGHT NOW</div>
        <div className="snapshot-copy">
          <span className="section-kicker">RIGHT NOW</span>
          <p>不用先翻完整清單，先看目前整體狀況。</p>
        </div>

        <div className="snapshot-main">
          <div className="snapshot-big">
            <span>現在有</span>
            <strong><CountUp value={stats.construction} decimals={0} /></strong>
            <span>項工程在施工階段</span>
          </div>

          <div className="snapshot-side">
            <div>
              <strong><CountUp value={stats.withProgress} decimals={0} /></strong>
              <span>項計畫有官方進度％可直接追</span>
            </div>
            <div>
              <strong><CountUp value={stats.planning} decimals={0} /></strong>
              <span>項計畫還在可研／綜規階段</span>
            </div>
            <div>
              <strong><CountUp value={stats.total} decimals={0} /></strong>
              <span>項計畫目前收錄在本站</span>
            </div>
          </div>
        </div>
      </section>

      <section className="spotlight-section deck-slide" id="focus">
        <div className="slide-index slide-index-dark" aria-hidden="true"><span>04</span><i /> NEAR COMPLETION</div>
        <div className="spotlight-heading">
          <div>
            <span className="section-kicker">NEAR COMPLETION</span>
            <h2>哪些工程最接近完工？</h2>
          </div>
          <p>只比較主管機關有公布整體工程進度百分比的施工案。</p>
        </div>

        {spotlight && (
          <motion.div
            className="spotlight-card"
            key={spotlight.id}
            style={{ '--route-color': spotlight.color } as React.CSSProperties}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.36 }}
          >
            <div className="spotlight-info">
              <div className="spotlight-meta">
                <span>{typeMeta[spotlight.type].code}</span>
                <span>{spotlight.region}</span>
                <span>{spotlight.phaseLabel}</span>
              </div>
              <h3>{spotlight.name}</h3>
              <p>{spotlight.latestUpdate}</p>
              <a href={spotlight.source.url} target="_blank" rel="noreferrer">
                官方來源 <ArrowUpRight size={15} />
              </a>
            </div>

            <div className="spotlight-progress">
              <span>官方工程進度</span>
              <strong><CountUp value={spotlight.progressPercent ?? 0} />%</strong>
              <div className="spotlight-track">
                <motion.i
                  initial={{ width: 0 }}
                  animate={{ width: `${spotlight.progressPercent ?? 0}%` }}
                  transition={{ duration: .85, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div className="spotlight-controls">
          <div className="spotlight-switches">
            {featured.map((project, index) => (
              <button
                key={project.id}
                className={index === spotlightIndex ? 'active' : ''}
                onClick={() => setSpotlightIndex(index)}
              >
                <span>0{index + 1}</span>
                <strong>{project.name}</strong>
                <small>{project.progressPercent?.toFixed(2)}%</small>
              </button>
            ))}
          </div>
          <div className="spotlight-arrows">
            <button onClick={() => moveSpotlight(-1)} aria-label="上一個重點工程"><ChevronLeft size={18} /></button>
            <button onClick={() => moveSpotlight(1)} aria-label="下一個重點工程"><ChevronRight size={18} /></button>
          </div>
        </div>
      </section>

      <section className="content deck-slide deck-slide-projects" id="projects">
        <div className="slide-index slide-index-dark" aria-hidden="true"><span>05</span><i /> ALL PROJECTS</div>
        <div className="board-intro">
          <div>
            <span className="section-kicker">ALL PROJECTS</span>
            <h2>全部工程進度</h2>
            <p>從快完工的一路往下看，或直接搜尋你關心的路線。</p>
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
                ['metro', '捷運'],
                ['tra', '臺鐵'],
                ['hsr', '高鐵'],
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
            只有主管機關明確公布整體百分比時才顯示％；其他計畫只呈現可驗證的行政／工程階段。
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
