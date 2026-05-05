import React, { useState, useEffect } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Label } from './ui/label'

interface Props {
    initial?: any
    onSave: (payload: any) => Promise<void>
    onUploadAvatar?: (file: File) => Promise<void>
}

export const ProfileForm: React.FC<Props> = ({ initial = {}, onSave, onUploadAvatar }) => {
    const [name, setName] = useState(initial.name || '')
    const [email, setEmail] = useState(initial.email || '')
    const [extra, setExtra] = useState<any>({})
    const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarUrl || null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setName(initial.name || '')
        setEmail(initial.email || '')
        setExtra(initial)
        setAvatarPreview(initial.avatarUrl || null)
    }, [initial])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            await onSave({ name, email, ...extra })
        } finally {
            setSaving(false)
        }
    }

    const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0]
        if (!f || !onUploadAvatar) return
        const url = URL.createObjectURL(f)
        setAvatarPreview(url)
        try {
            await onUploadAvatar(f)
        } finally {
            URL.revokeObjectURL(url)
        }
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='flex items-center gap-4'>
                <div className='w-24 h-24 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center'>
                    {avatarPreview ? <img src={avatarPreview} alt='avatar' className='w-full h-full object-cover' /> : <div className='text-sm text-muted-foreground'>No Avatar</div>}
                </div>
                <div>
                    <Label>Avatar</Label>
                    <Input type='file' onChange={handleAvatar} />
                </div>
            </div>

            <div>
                <Label className='mb-1'>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
                <Label className='mb-1'>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className='flex gap-2'>
                <Button type='submit' disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
        </form>
    )
}

export default ProfileForm
