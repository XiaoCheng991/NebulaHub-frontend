"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Upload, User, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { AvatarCropDialog } from "@/components/ui/avatar-crop-dialog"
import LayoutWithFullWidth from "@/components/LayoutWithFullWidth"
import { getLocalUserInfo } from "@/lib/client-auth"
import { uploadFile } from "@/lib/api-client"

interface UserInfo {
  id: number
  username: string
  email: string
  nickname: string
  avatar: string | null
}

interface UserProfile {
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 裁剪相关状态
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)

  const [userInfo, setUserInfo] = useState<UserInfo>({
    id: 0,
    username: "",
    email: "",
    nickname: "",
    avatar: null,
  })

  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    displayName: "",
    avatarUrl: null,
    bio: "",
  })

  useEffect(() => {
    fetchUserInfo()
  }, [])

  const fetchUserInfo = async () => {
    try {
      const localUser = getLocalUserInfo()
      if (!localUser) {
        router.push('/login')
        return
      }

      setUserInfo(localUser)

      // 从后端获取完整的用户档案
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8080/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200 && data.data) {
          setProfile(data.data)
        }
      } else {
        // 如果后端还没有用户档案API，使用本地数据
        setProfile({
          username: localUser.username,
          displayName: localUser.nickname || "",
          avatarUrl: localUser.avatar,
          bio: "",
        })
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      // 如果API调用失败，使用本地用户信息
      const localUser = getLocalUserInfo()
      if (localUser) {
        setProfile({
          username: localUser.username,
          displayName: localUser.nickname || "",
          avatarUrl: localUser.avatar,
          bio: "",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "文件类型错误",
        description: "请上传图片文件",
        variant: "destructive",
      })
      return
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "图片大小不能超过 5MB",
        variant: "destructive",
      })
      return
    }

    // 保存文件并显示裁剪对话框
    setOriginalFile(file)
    const imageUrl = URL.createObjectURL(file)
    setSelectedImage(imageUrl)
    setShowCropDialog(true)

    // 清空 input
    e.target.value = ''
  }

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setUploading(true)
    setShowCropDialog(false)

    try {
      // 将Blob转换为File对象
      const file = new File([croppedImageBlob], originalFile?.name || 'avatar.jpg', {
        type: 'image/jpeg',
      })

      // 创建FormData
      const formData = new FormData()
      formData.append('file', file)

      // 调用后端上传API
      const { url } = await uploadFile('/api/file/upload', file)

      // 更新本地状态
      const newAvatarUrl = url
      setProfile(prev => ({ ...prev, avatarUrl: newAvatarUrl }))
      setUserInfo(prev => ({ ...prev, avatar: newAvatarUrl }))

      toast({
        title: "上传成功",
        description: "头像已更新",
      })
    } catch (error: any) {
      toast({
        title: "上传失败",
        description: error.message || "无法上传头像",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage)
        setSelectedImage(null)
      }
      setOriginalFile(null)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('未登录')
      }

      // 构建更新数据
      const updateData = {
        username: profile.username,
        nickname: profile.displayName,
        bio: profile.bio,
        avatar: profile.avatarUrl,
      }

      const response = await fetch('http://localhost:8080/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '保存失败')
      }

      const data = await response.json()
      if (data.code === 200) {
        // 更新本地用户信息
        const updatedUser = {
          ...userInfo,
          nickname: profile.displayName,
          avatar: profile.avatarUrl,
        }
        localStorage.setItem('userInfo', JSON.stringify(updatedUser))
        setUserInfo(updatedUser)

        toast({
          title: "保存成功",
          description: "个人信息已更新",
        })
      } else {
        throw new Error(data.message || '保存失败')
      }
    } catch (error: any) {
      console.error('Error saving:', error)
      toast({
        title: "保存失败",
        description: error.message || "无法保存信息",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <LayoutWithFullWidth>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutWithFullWidth>
    )
  }

  return (
    <LayoutWithFullWidth>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">账号设置</h1>
          <p className="text-muted-foreground mt-1">
            管理你的个人信息和偏好设置
          </p>
        </div>

        {/* 头像设置 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              个人头像
            </CardTitle>
            <CardDescription>
              上传你的个人头像，让朋友更容易认出你
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="w-24 h-24 rounded-2xl object-cover shadow-lg ring-4 ring-blue-500/10"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center shadow-lg ring-4 ring-blue-500/10">
                    <User className="h-12 w-12 text-blue-500" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>上传中...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span className="font-medium">上传新头像</span>
                      </>
                    )}
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    支持 JPG, PNG, GIF
                  </span>
                  <span>最大 5MB</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-cyan-500" />
              基本信息
            </CardTitle>
            <CardDescription>
              你的账号基本信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 邮箱 */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600">电子邮箱</Label>
                <Input
                  id="email"
                  value={userInfo.email}
                  disabled
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-400">邮箱不可修改</p>
              </div>

              {/* 用户名 */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-600">用户名</Label>
                <Input
                  id="username"
                  value={profile.username}
                  disabled
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-400">用户名唯一且不可修改</p>
              </div>

              {/* 显示名称 */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="displayName">显示名称</Label>
                <Input
                  id="displayName"
                  value={profile.displayName}
                  onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="输入显示名称"
                  maxLength={100}
                />
                <div className="flex justify-end">
                  <span className="text-xs text-slate-400">
                    {profile.displayName?.length || 0}/100
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 个人简介 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              个人简介
            </CardTitle>
            <CardDescription>
              介绍一下自己，让朋友们更好地了解你
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-slate-600">简介内容</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="写点什么介绍自己..."
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              <div className="flex justify-end">
                <span className={`text-xs ${(profile.bio?.length || 0) >= 500 ? 'text-red-500' : 'text-slate-400'}`}>
                  {profile.bio?.length || 0} / 500
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span className="font-medium">保存更改</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 头像裁剪对话框 */}
      {selectedImage && (
        <AvatarCropDialog
          open={showCropDialog}
          onOpenChange={setShowCropDialog}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
        />
      )}
    </LayoutWithFullWidth>
  )
}
