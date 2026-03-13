import { createAuthAxios } from '../shared/createAuthAxios'
import { studentAuthConfig } from '../shared/authConfig'

const axiosInstance = createAuthAxios(studentAuthConfig)

export default axiosInstance
