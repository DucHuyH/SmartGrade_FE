import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { User, Lock, Camera, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'

type Profile = {
    userId?: string | number
    userCode?: string
    name?: string
    email?: string
    avatarUrl?: string
    avatarPublicId?: string
    role?: string
    status?: string
    createdAt?: string
}

interface Props {
    initial?: Profile | null
    onSave: (payload: any) => Promise<any>
    onUploadAvatar?: (file: File) => Promise<any>
    onChangePassword: (oldPassword: string, newPassword: string) => Promise<any>
}

const EMPTY_PROFILE: Profile = {
    userId: '',
    userCode: '',
    name: '',
    email: '',
    avatarUrl: '',
    avatarPublicId: '',
    role: '',
    status: '',
    createdAt: ''
}

const formatDateTime = (value?: string) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString()
}

export const ProfileSettings: React.FC<Props> = ({ initial, onSave, onUploadAvatar, onChangePassword }) => {
    const [tab, setTab] = useState<'profile' | 'security'>('profile')
    const [profile, setProfile] = useState<Profile>(initial ?? EMPTY_PROFILE)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [openConfirm, setOpenConfirm] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // sync when initial changes
    useEffect(() => {
        if (initial && Object.keys(initial).length > 0) setProfile(initial)
        if (!initial) setProfile(EMPTY_PROFILE)
    }, [initial])

    const handleEdit = () => setEditing(true)
    const handleCancel = () => {
        setEditing(false)
        setProfile(initial ?? EMPTY_PROFILE)
        setPreviewUrl(null)
    }

    const handleSaveClick = () => {
        setOpenConfirm(true)
    }

    const handleConfirmSave = async () => {
        setSaving(true)
        try {
            const res = await onSave(profile)
            setProfile(res || profile)
            setEditing(false)
            setOpenConfirm(false)
            toast.success('Profile updated successfully')
        } catch (err: any) {
            console.error(err)
            const message = err?.response?.data?.message || 'Failed to update profile'
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0]
        if (!f || !onUploadAvatar) return

        // Preview file immediately
        const reader = new FileReader()
        reader.onload = (event) => {
            const preview = event.target?.result as string
            setPreviewUrl(preview)
        }
        reader.readAsDataURL(f)

        // Upload file
        setUploadingAvatar(true)
        try {
            const res = await onUploadAvatar(f)
            const newUrl = res?.avatarUrl ?? res?.url ?? previewUrl
            setProfile((p) => ({ ...p, avatarUrl: newUrl, avatarPublicId: res?.avatarPublicId ?? p.avatarPublicId }))
            setPreviewUrl(null)
            toast.success('Avatar uploaded successfully')
        } catch (err: any) {
            console.error(err)
            const message = err?.response?.data?.message || 'Failed to upload avatar'
            toast.error(message)
            setPreviewUrl(null)
        } finally {
            setUploadingAvatar(false)
        }
    }

    return (
        <div className='grid grid-cols-12 gap-6'>
            <div className='col-span-4 bg-white rounded-lg p-6 shadow-sm'>
                <h3 className='text-lg font-medium mb-4'>Profile Photo</h3>
                <div className='flex flex-col items-center gap-4'>
                    <div
                        className={`relative w-36 h-36 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-2xl ${editing ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''
                            }`}
                        onClick={editing ? handleAvatarClick : undefined}
                    >
                        {previewUrl || profile.avatarUrl ? (
                            <img src={previewUrl || profile.avatarUrl} className='w-full h-full object-cover' alt='avatar' />
                        ) : (
                            <span>{(profile.name || 'U').split(' ').map((s) => s[0]).slice(0, 3).join('')}</span>
                        )}

                        {editing && (
                            <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity'>
                                {uploadingAvatar ? (
                                    <Loader2 className='w-8 h-8 text-white animate-spin' />
                                ) : (
                                    <Camera className='w-8 h-8 text-white' />
                                )}
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/*'
                        onChange={handleAvatar}
                        className='hidden'
                    />

                    <div className='text-center'>
                        <div className='font-medium'>{profile.name || 'Unknown user'}</div>
                        <div className='text-sm text-muted-foreground'>{profile.role || ''}</div>
                        <div className='text-sm text-muted-foreground'>{profile.userCode || ''}</div>
                    </div>
                </div>
            </div>

            <div className='col-span-8 bg-white rounded-lg p-6 shadow-sm'>
                <div className='flex justify-between items-start'>
                    <h3 className='text-lg font-medium'>Account Information</h3>
                    {!editing ? (
                        <Button onClick={handleEdit}>Edit Profile</Button>
                    ) : (
                        <div className='flex gap-2'>
                            <Button variant='outline' onClick={handleCancel}>Cancel</Button>
                            <Button onClick={handleSaveClick} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                        </div>
                    )}
                </div>

                <div className='mt-4'>
                    <Tabs value={tab} onValueChange={(v) => setTab(v as 'profile' | 'security')}>
                        <TabsList className="grid grid-cols-2">
                            <TabsTrigger value='profile'>
                                <User className="h-4 w-4 mr-2" />
                                Profile
                            </TabsTrigger>
                            <TabsTrigger value='security'>
                                <Lock className="h-4 w-4 mr-2" />
                                Security
                            </TabsTrigger>
                        </TabsList>

                        <div className='mt-6'>
                            <TabsContent value='profile'>
                                <div className='space-y-4'>
                                    <div>
                                        <Label className='mb-1'>Full Name</Label>
                                        <Input value={profile.name ?? ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} disabled={!editing} />
                                    </div>

                                    <div>
                                        <Label className='mb-1'>Email Address</Label>
                                        <Input value={profile.email ?? ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} disabled={!editing} />
                                    </div>

                                    <div className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <Label className='mb-1'>User ID</Label>
                                            <Input value={profile.userId ? String(profile.userId) : ''} disabled />
                                        </div>
                                        <div>
                                            <Label className='mb-1'>User Code</Label>
                                            <Input value={profile.userCode ?? ''} disabled />
                                        </div>
                                    </div>

                                    <div className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <Label className='mb-1'>Role</Label>
                                            <Input value={profile.role ?? ''} disabled />
                                        </div>
                                        <div>
                                            <Label className='mb-1'>Status</Label>
                                            <Input value={profile.status ?? ''} disabled />
                                        </div>
                                    </div>

                                    <div>
                                        <Label className='mb-1'>Created At</Label>
                                        <Input value={formatDateTime(profile.createdAt)} disabled />
                                    </div>

                                    <div>
                                        <Label className='mb-1'>Avatar Public ID</Label>
                                        <Input value={profile.avatarPublicId ?? ''} disabled />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value='security'>
                                <div className='max-w-lg'>
                                    <ChangePasswordForm onChange={onChangePassword} />
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>

            <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Changes</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to save these changes to your profile?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setOpenConfirm(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

const ChangePasswordForm: React.FC<{ onChange: (oldP: string, newP: string) => Promise<any> }> = ({ onChange }) => {
    const [oldP, setOldP] = useState('')
    const [newP, setNewP] = useState('')
    const [confirmP, setConfirmP] = useState('')
    const [loading, setLoading] = useState(false)

    const valid = newP.length >= 8 && newP === confirmP

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!valid) {
            toast.error('Password validation failed')
            return
        }
        setLoading(true)
        try {
            await onChange(oldP, newP)
            setOldP('')
            setNewP('')
            setConfirmP('')
            toast.success('Password updated successfully')
        } catch (err: any) {
            console.error(err)
            const message = err?.response?.data?.message || 'Failed to update password'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={submit} className='space-y-3'>
            <div>
                <Label className='mb-1'>Current Password</Label>
                <Input type='password' placeholder='Enter current password' value={oldP} onChange={(e) => setOldP(e.target.value)} />
            </div>
            <div>
                <Label className='mb-1'>New Password</Label>
                <Input type='password' placeholder='Enter new password' value={newP} onChange={(e) => setNewP(e.target.value)} />
            </div>
            <div>
                <Label className='mb-1'>Confirm New Password</Label>
                <Input type='password' placeholder='Confirm new password' value={confirmP} onChange={(e) => setConfirmP(e.target.value)} />
            </div>
            <div className='text-sm p-3 bg-blue-50 rounded-md'>Password must be at least 8 characters long.</div>
            <div>
                <Button type='submit' disabled={!valid || loading}>{loading ? 'Changing...' : 'Change Password'}</Button>
            </div>
        </form>
    )
}

export default ProfileSettings
