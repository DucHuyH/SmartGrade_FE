export interface Criteria {
    criteria_id: string | number
    rubric_id: string | number
    criteria_name: string
    description: string
    max_score: number
    weight: number
}

export type Criteia = Criteria

export interface Rubric {
    rubric_id: string | number
    assignment_id: string | number
    title: string
    criteria: Criteria[]
}

export type CriteriaPayload = Omit<Criteria, 'criteria_id' | 'rubric_id'> & {
    criteria_id?: Criteria['criteria_id']
    rubric_id?: Criteria['rubric_id']
}

export type RubricPayload = Omit<Rubric, 'rubric_id' | 'assignment_id' | 'criteria'> & {
    rubric_id?: Rubric['rubric_id']
    assignment_id?: Rubric['assignment_id']
    criteria: CriteriaPayload[]
}