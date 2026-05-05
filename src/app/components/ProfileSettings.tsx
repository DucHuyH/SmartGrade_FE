import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { User, Lock } from 'lucide-react'

type Profile = {
    id?: string
    name?: string
    email?: string
    staffId?: string
    studentId?: string
    department?: string
    officeLocation?: string
    phone?: string
    bio?: string
    avatarUrl?: string
}

interface Props {
    initial?: Profile | null
    onSave: (payload: any) => Promise<any>
    onUploadAvatar?: (file: File) => Promise<any>
    onChangePassword: (oldPassword: string, newPassword: string) => Promise<any>
}

const MOCK: Profile = {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@university.edu',
    staffId: 'L001',
    department: 'Computer Science',
    officeLocation: 'Building A, Room 304',
    phone: '+1 (555) 123-4567',
    bio: 'Lecturer in Computer Science',
    avatarUrl: undefined
}

export const ProfileSettings: React.FC<Props> = ({ initial, onSave, onUploadAvatar, onChangePassword }) => {
    const [tab, setTab] = useState<'profile' | 'security'>('profile')
    const [profile, setProfile] = useState<Profile>(initial ?? MOCK)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)

    // sync when initial changes
    useEffect(() => {
        if (initial && Object.keys(initial).length > 0) setProfile(initial)
        if (!initial) setProfile(MOCK)
    }, [initial])

    const handleEdit = () => setEditing(true)
    const handleCancel = () => {
        setEditing(false)
        setProfile(initial ?? MOCK)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await onSave(profile)
            setProfile(res || profile)
            setEditing(false)
            alert('Saved')
        } catch (err) {
            console.error(err)
            alert('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0]
        if (!f || !onUploadAvatar) return
        try {
            const res = await onUploadAvatar(f)
            // try both common keys
            setProfile((p) => ({ ...p, avatarUrl: res?.avatarUrl ?? res?.url ?? p.avatarUrl }))
        } catch (err) {
            console.error(err)
            alert('Failed to upload avatar')
        }
    }

    return (
        <div className='grid grid-cols-12 gap-6'>
            <div className='col-span-4 bg-white rounded-lg p-6 shadow-sm'>
                <h3 className='text-lg font-medium mb-4'>Profile Photo</h3>
                <div className='flex flex-col items-center gap-4'>
                    <div className='w-36 h-36 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-2xl'>
                        {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} className='w-full h-full object-cover' alt='avatar' />
                        ) : (
                            <span>{(profile.name || 'U').split(' ').map(s => s[0]).slice(0, 3).join('')}</span>
                        )}
                    </div>
                    {editing && (
                        <div className='w-full'>
                            <Input type='file' onChange={handleAvatar} />
                        </div>
                    )}
                    <div className='text-center'>
                        <div className='font-medium'>{profile.name}</div>
                        <div className='text-sm text-muted-foreground'>{profile.department || ''}</div>
                        <div className='text-sm text-muted-foreground'>{profile.staffId ?? profile.studentId}</div>
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
                            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
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
                                        <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} disabled={!editing} />
                                    </div>

                                    <div>
                                        <Label className='mb-1'>Email Address</Label>
                                        <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} disabled={!editing} />
                                    </div>

                                    <div className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <Label className='mb-1'>{profile.staffId ? 'Staff ID' : 'Student ID'}</Label>
                                            <Input value={profile.staffId ?? profile.studentId} onChange={(e) => setProfile({ ...profile, staffId: e.target.value })} disabled={!editing} />
                                        </div>
                                        <div>
                                            <Label className='mb-1'>Department</Label>
                                            <Input value={profile.department} onChange={(e) => setProfile({ ...profile, department: e.target.value })} disabled={!editing} />
                                        </div>
                                    </div>

                                    <div>
                                        <Label className='mb-1'>Office Location</Label>
                                        <Input value={profile.officeLocation} onChange={(e) => setProfile({ ...profile, officeLocation: e.target.value })} disabled={!editing} />
                                    </div>

                                    <div>
                                        <Label className='mb-1'>Phone Number</Label>
                                        <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} disabled={!editing} />
                                    </div>

                                    <div>
                                        <Label className='mb-1'>Bio</Label>
                                        <textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className='w-full rounded-md border px-3 py-2' disabled={!editing} />
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
        if (!valid) return alert('Password validation failed')
        setLoading(true)
        try {
            await onChange(oldP, newP)
            setOldP('')
            setNewP('')
            setConfirmP('')
            alert('Password updated')
        } catch (err) {
            console.error(err)
            alert('Failed to update password')
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
