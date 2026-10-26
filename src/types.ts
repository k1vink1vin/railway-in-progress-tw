export type ProjectType = 'metro' | 'tra' | 'hsr'

export type ProjectPhase =
  | 'feasibility'
  | 'comprehensive-planning'
  | 'approved'
  | 'design'
  | 'tender'
  | 'construction'
  | 'testing'
  | 'operating'

export interface ProjectSource {
  agency: string
  title: string
  url: string
  officialUpdatedAt?: string
}

export interface Milestone {
  date: string
  title: string
  detail?: string
}

export interface RailwayProject {
  id: string
  name: string
  type: ProjectType
  region: string
  agency: string
  color: string
  phase: ProjectPhase
  phaseLabel: string
  progressPercent?: number
  progressNote?: string
  expectedCompletion?: string
  latestUpdate: string
  lastCheckedAt: string
  description: string
  milestones?: Milestone[]
  source: ProjectSource
}
