export interface Criteria {
    criteria_id: string | number
    rubric_id: string | number
    criteria_name: string
    description: string
    max_score: number
    weight: number
    ranges?: CriteriaRange[]
}

export type Criteia = Criteria

export interface CriteriaRange {
    range_id?: string | number
    criteria_id?: string | number
    level: string
    min_score: number
    max_score: number
    description: string
    created_at?: string
}

export interface CriteriaRangePayload {
    level: string
    min_score: number
    max_score: number
    description: string
}

export interface Rubric {
    rubric_id: string | number
    assignment_id: string | number
    title: string
    criteria: Criteria[]
}

export type CriteriaPayload = {
    criteria_id?: Criteria['criteria_id']
    rubric_id?: Criteria['rubric_id']
    criteria_name: string
    description: string
    weight: number
    max_score?: number
    ranges?: CriteriaRangePayload[]
}

export type RubricPayload = Omit<Rubric, 'rubric_id' | 'assignment_id' | 'criteria'> & {
    rubric_id?: Rubric['rubric_id']
    assignment_id?: Rubric['assignment_id']
    criteria: CriteriaPayload[]
}