"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, FileText, User } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin")
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  if (loading) {
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
                className="text-[#8b7355] hover:text-[#4a3728] font-light"
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
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="bg-[#4a3728] text-white text-lg">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-light text-[#4a3728] mb-2">
                Welcome back, {userName.split(' ')[0]}!
              </h1>
              <p className="text-[#8b7355] font-light">
                Ready to work on your applications?
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/applications">
            <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3] hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-light text-[#4a3728] flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  My Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#8b7355] font-light">
                  View and manage your college applications
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/applications?new=true">
            <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3] hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-light text-[#4a3728] flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  New Application
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#8b7355] font-light">
                  Start working on a new application
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-light text-[#4a3728] flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#8b7355] font-light mb-2">{user.email}</p>
              <p className="text-sm text-[#8b7355] font-light">
                Joined {new Date(user.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Placeholder */}
        <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
          <CardHeader>
            <CardTitle className="text-xl font-light text-[#4a3728]">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#8b7355] font-light">
              No recent activity. Start by creating your first application!
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}