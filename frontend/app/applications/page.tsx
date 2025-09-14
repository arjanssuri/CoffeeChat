"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, FileText, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Application {
  id: string
  title: string
  school: string
  deadline: string
  status: 'draft' | 'in-progress' | 'submitted'
  created_at: string
  updated_at: string
  user_id: string
}

export default function ApplicationsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newApp, setNewApp] = useState({
    title: "",
    school: "",
    deadline: "",
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowNewDialog(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      fetchApplications()
    }
  }, [user])

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching applications:', error)
        return
      }

      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createApplication = async () => {
    if (!newApp.title || !newApp.school || !user) return

    try {
      const { data, error } = await supabase
        .from('applications')
        .insert({
          title: newApp.title,
          school: newApp.school,
          deadline: newApp.deadline,
          status: 'draft',
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating application:', error)
        return
      }

      setApplications(prev => [data, ...prev])
      setNewApp({ title: "", school: "", deadline: "" })
      setShowNewDialog(false)

      // Navigate to the editor for this application
      router.push(`/applications/${data.id}/edit`)
    } catch (error) {
      console.error('Error creating application:', error)
    }
  }

  const deleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting application:', error)
        return
      }

      setApplications(prev => prev.filter(app => app.id !== id))
    } catch (error) {
      console.error('Error deleting application:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#fff5e9] flex items-center justify-center">
        <div className="text-[#4a3728]">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const userName = user.user_metadata?.full_name || 
                   `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 
                   user.email?.split('@')[0] || 'User'
  
  const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100'
      case 'in-progress': return 'text-blue-600 bg-blue-100'
      case 'submitted': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-[#fff5e9]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#e6d5c3] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <Image src="/images/goose-logo.png" alt="CoffeeChat Logo" width={40} height={40} />
              <span className="text-xl font-light text-[#4a3728]">CoffeeChat</span>
            </Link>
            
            <nav className="flex items-center space-x-6">
              <Link 
                href="/dashboard" 
                className="text-[#8b7355] hover:text-[#4a3728] font-light"
              >
                Dashboard
              </Link>
              <Link 
                href="/applications" 
                className="text-[#4a3728] font-medium border-b-2 border-[#4a3728]"
              >
                Applications
              </Link>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback className="bg-[#4a3728] text-white text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-[#4a3728]">{userName}</span>
                </div>
                
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="border-[#e6d5c3] hover:bg-[#f5ebe1] text-[#4a3728] font-light"
                >
                  Sign Out
                </Button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-light text-[#4a3728] mb-2">My Applications</h1>
            <p className="text-[#8b7355] font-light">
              {applications.length} application{applications.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#4a3728] hover:bg-[#3d2e21] text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Application</DialogTitle>
                <DialogDescription>
                  Start a new college application. You can always edit the details later.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={newApp.title}
                    onChange={(e) => setNewApp(prev => ({ ...prev, title: e.target.value }))}
                    className="col-span-3"
                    placeholder="Common App Essay"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="school" className="text-right">
                    School
                  </Label>
                  <Input
                    id="school"
                    value={newApp.school}
                    onChange={(e) => setNewApp(prev => ({ ...prev, school: e.target.value }))}
                    className="col-span-3"
                    placeholder="University of Texas"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="deadline" className="text-right">
                    Deadline
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newApp.deadline}
                    onChange={(e) => setNewApp(prev => ({ ...prev, deadline: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={createApplication}
                  disabled={!newApp.title || !newApp.school}
                  className="bg-[#4a3728] hover:bg-[#3d2e21] text-white"
                >
                  Create Application
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Applications Grid */}
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-[#8b7355] mx-auto mb-4" />
            <h3 className="text-xl font-light text-[#4a3728] mb-2">No applications yet</h3>
            <p className="text-[#8b7355] font-light mb-6">
              Create your first application to get started
            </p>
            <Button 
              onClick={() => setShowNewDialog(true)}
              className="bg-[#4a3728] hover:bg-[#3d2e21] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Application
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
              <Card key={app.id} className="bg-white/80 backdrop-blur-sm border-[#e6d5c3] hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-light text-[#4a3728] mb-1">
                        {app.title}
                      </CardTitle>
                      <p className="text-[#8b7355] font-light text-sm">{app.school}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/applications/${app.id}/edit`)}
                        className="h-8 w-8 p-0 hover:bg-[#f5ebe1]"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteApplication(app.id)}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#8b7355]">Status</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(app.status)}`}>
                        {app.status.replace('-', ' ')}
                      </span>
                    </div>
                    {app.deadline && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#8b7355]">Deadline</span>
                        <span className="text-sm text-[#4a3728]">
                          {new Date(app.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#8b7355]">Created</span>
                      <span className="text-sm text-[#4a3728]">
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => router.push(`/applications/${app.id}/edit`)}
                    className="w-full mt-4 bg-[#4a3728] hover:bg-[#3d2e21] text-white"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Application
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}