export interface Lecturer {
    user_id: string
    name: string
    email: string
    profile_picture?: string
}

export interface Student {
    user_id: string
    name: string
    email: string
    profile_picture?: string
}


export interface Course {
    course_id: string
    name: string
    course_code: string
    semester: string
    academic_year?: string
    resources?: string
    // description?: string
    lecturer?: Lecturer
    createdAt?: string
}
