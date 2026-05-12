type RawProfile = Record<string, any>

const pickUser = (payload: any): RawProfile | null => {
    if (!payload || typeof payload !== 'object') return null

    const data = payload.data ?? payload
    if (data?.user && typeof data.user === 'object') return data.user
    if (payload.user && typeof payload.user === 'object') return payload.user

    if (
        data &&
        typeof data === 'object' &&
        ('user_id' in data || 'userId' in data || 'name' in data || 'email' in data)
    ) {
        return data
    }

    return null
}

const normalizeProfile = (raw: RawProfile | null) => {
    if (!raw) return null

    return {
        userId: raw.user_id ?? raw.userId ?? raw.id,
        userCode: raw.user_code ?? raw.userCode,
        name: raw.name,
        email: raw.email,
        avatarUrl: raw.avatar_url ?? raw.avatarUrl,
        avatarPublicId: raw.avatar_public_id ?? raw.avatarPublicId,
        role: raw.role,
        status: raw.status,
        createdAt: raw.created_at ?? raw.createdAt
    }
}

const toUpdatePayload = (payload: any) => {
    if (!payload || typeof payload !== 'object') return payload

    // Create FormData to support file upload along with text fields
    const fd = new FormData()
    if (payload.name) fd.append('name', payload.name)
    if (payload.email) fd.append('email', payload.email)
    if (payload.avatarFile instanceof File) fd.append('avatar', payload.avatarFile)

    return fd
}

export function createProfileService(axiosInstance: any, _basePath?: string) {
    const getProfile = async () => {
        try {
            const res = await axiosInstance.get('/users/profile', { withCredentials: true })
            console.log('Raw profile response:', res)
            return normalizeProfile(pickUser(res.data))
        } catch (error: any) {
            throw error
        }
    }

    const updateProfile = async (payload: any) => {
        try {
            const formData = toUpdatePayload(payload)
            console.log('Updating profile with form-data:', formData)
            const res = await axiosInstance.put('/users/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            })
            console.log('Raw update profile response:', res)
            return normalizeProfile(pickUser(res.data))
        } catch (error: any) {
            throw error
        }
    }

    const uploadAvatar = async (file: File) => {
        try {
            const fd = new FormData()
            fd.append('avatar', file)
            const res = await axiosInstance.put('/users/profile', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            })

            const normalized = normalizeProfile(pickUser(res.data))
            if (normalized) return normalized

            const fallback = res.data?.data ?? res.data
            return {
                avatarUrl: fallback?.avatar_url ?? fallback?.avatarUrl ?? fallback?.url,
                avatarPublicId: fallback?.avatar_public_id ?? fallback?.avatarPublicId
            }
        } catch (error: any) {
            throw error
        }
    }

    const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
        try {
            const res = await axiosInstance.patch('/users/change-password', {
                currentPassword,
                newPassword,
                confirmPassword
            }, { withCredentials: true })
            return res.data?.data ?? res.data
        } catch (error: any) {
            throw error
        }
    }

    return {
        getProfile,
        updateProfile,
        uploadAvatar,
        changePassword
    }
}

export default createProfileService
