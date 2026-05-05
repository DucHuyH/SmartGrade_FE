import axiosInstance from './axios'
import createProfileService from '../shared/createProfileService'

export const {
    getProfile,
    updateProfile,
    uploadAvatar,
    changePassword
} = createProfileService(axiosInstance, 'student')
