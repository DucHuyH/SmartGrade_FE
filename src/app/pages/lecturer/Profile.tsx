import React, { useEffect, useState } from 'react'
import ProfileSettings from '../../components/ProfileSettings'
import { getProfile, updateProfile, uploadAvatar, changePassword } from '../../services/lecturer/profileService'

export const LecturerProfile: React.FC = () => {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = async () => {
        try {
            const res = await getProfile()
            console.log('Fetched profile:', res)
            setProfile(res)
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        ; (async () => {
            try {
                const res = await getProfile()
                setProfile(res)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const handleSave = async (payload: any) => {
        const res = await updateProfile(payload)
        setProfile(res)
        return res
    }

    const handleUpload = async (file: File) => {
        const res = await uploadAvatar(file)
        setProfile((p: any) => ({
            ...(p ?? {}),
            avatarUrl: res?.avatarUrl ?? p?.avatarUrl,
            avatarPublicId: res?.avatarPublicId ?? p?.avatarPublicId
        }))
        // Refetch profile to sync updated avatar from server
        await fetchProfile()
        return res
    }

    const handleChangePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<any> = async (currentPassword, newPassword, confirmPassword) => {
        return changePassword(currentPassword, newPassword, confirmPassword)
    }

    return (
        <div>
            <h2 className='text-2xl font-semibold mb-4'>Profile</h2>
            {loading ? <div>Loading...</div> : <ProfileSettings initial={profile} onSave={handleSave} onUploadAvatar={handleUpload} onChangePassword={handleChangePassword} />}
        </div>
    )
}

export default LecturerProfile
