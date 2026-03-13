import { createAuthAxios } from '../shared/createAuthAxios'
import { lecturerAuthConfig } from '../shared/authConfig'

const axiosInstance = createAuthAxios(lecturerAuthConfig)

export default axiosInstance
