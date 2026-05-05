import axiosInstanceType from 'axios'

export function createProfileService(axiosInstance: any, basePath: string) {
    const getProfile = async () => {
        try {
            const res = await axiosInstance.get(`/${basePath}/profile/me`, { withCredentials: true })
            return res.data
        } catch (error: any) {
            throw error
        }
    }

    const updateProfile = async (payload: any) => {
        try {
            const res = await axiosInstance.put(`/${basePath}/profile`, payload, { withCredentials: true })
            return res.data
        } catch (error: any) {
            throw error
        }
    }

    const uploadAvatar = async (file: File) => {
        try {
            const fd = new FormData()
            fd.append('avatar', file)
            const res = await axiosInstance.post(`/${basePath}/profile/avatar`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            })
            return res.data
        } catch (error: any) {
            throw error
        }
    }

    const changePassword = async (oldPassword: string, newPassword: string) => {
        try {
            const res = await axiosInstance.post(`/${basePath}/profile/change-password`, { oldPassword, newPassword }, { withCredentials: true })
            return res.data
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
