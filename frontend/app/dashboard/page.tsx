"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, FileText, User, Calendar, Clock, Building } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { CalendarEvent, calendarService } from "@/lib/calendar"

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

export default function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [recentApplications, setRecentApplications] = useState<Application[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Application[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [isCalendarConnected, setIsCalendarConnected] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setIsLoadingData(true)

      // Fetch recent applications (last 3)
      const { data: recent, error: recentError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (recentError) {
        console.error('Error fetching recent applications:', recentError)
      } else {
        setRecentApplications(recent || [])
      }

      // Fetch upcoming deadlines (next 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { data: deadlines, error: deadlinesError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user?.id)
        .gte('deadline', new Date().toISOString().split('T')[0])
        .lte('deadline', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('deadline', { ascending: true })
        .limit(5)

      if (deadlinesError) {
        console.error('Error fetching upcoming deadlines:', deadlinesError)
      } else {
        setUpcomingDeadlines(deadlines || [])
      }

      // Check if calendar is connected and fetch events
      if (calendarService.isAuthenticated()) {
        const events = await calendarService.getEvents()
        setCalendarEvents(events.slice(0, 3)) // Show only first 3 events
        setIsCalendarConnected(true)
      } else {
        setIsCalendarConnected(false)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

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
              <Link 
                href="/calendar" 
                className="text-[#8b7355] hover:text-[#4a3728] font-light"
              >
                Calendar
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

        {/* User Profile */}
        <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3] mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="bg-[#4a3728] text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[#4a3728] font-medium">{userName}</p>
                <p className="text-[#8b7355] font-light text-sm">{user.email}</p>
                <p className="text-xs text-[#8b7355] font-light">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Applications & Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Applications */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Recent Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="text-[#8b7355] font-light">Loading...</div>
              ) : recentApplications.length === 0 ? (
                <div className="text-[#8b7355] font-light">
                  No applications yet. <Link href="/applications?new=true" className="text-[#4a3728] underline">Create your first one!</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <Link key={app.id} href={`/applications/${app.id}/edit`}>
                      <div className="border border-[#e6d5c3] rounded-lg p-3 hover:bg-[#f5ebe1] transition-colors cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-[#4a3728] text-sm">{app.title}</h3>
                            <p className="text-xs text-[#8b7355]">{app.school}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            app.status === 'submitted' ? 'bg-green-100 text-green-800' :
                            app.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {app.status.replace('-', ' ')}
                          </span>
                        </div>
                        {app.deadline && (
                          <p className="text-xs text-[#8b7355] mt-1">
                            Due: {new Date(app.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="text-[#8b7355] font-light">Loading...</div>
              ) : upcomingDeadlines.length === 0 ? (
                <div className="text-[#8b7355] font-light">
                  No upcoming deadlines in the next 30 days.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.map((app) => {
                    const deadline = new Date(app.deadline)
                    const today = new Date()
                    const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    
                    return (
                      <Link key={app.id} href={`/applications/${app.id}/edit`}>
                        <div className="border border-[#e6d5c3] rounded-lg p-3 hover:bg-[#f5ebe1] transition-colors cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-[#4a3728] text-sm">{app.title}</h3>
                              <p className="text-xs text-[#8b7355]">{app.school}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              daysUntil <= 3 ? 'bg-red-100 text-red-800' :
                              daysUntil <= 7 ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {daysUntil <= 0 ? 'Due today' : `${daysUntil} days`}
                            </span>
                          </div>
                          <p className="text-xs text-[#8b7355] mt-1">
                            Due: {deadline.toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Suggestions & Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Suggestions */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border border-[#e6d5c3] rounded-lg p-3">
                  <h3 className="font-medium text-[#4a3728] text-sm mb-2">💡 Start Your Essays Early</h3>
                  <p className="text-xs text-[#8b7355]">
                    Begin working on your essays at least 2 weeks before the deadline for the best results.
                  </p>
                </div>
                <div className="border border-[#e6d5c3] rounded-lg p-3">
                  <h3 className="font-medium text-[#4a3728] text-sm mb-2">📝 Use the AI Assistant</h3>
                  <p className="text-xs text-[#8b7355]">
                    Try asking the AI chatbot for feedback on your essay structure and content.
                  </p>
                </div>
                <div className="border border-[#e6d5c3] rounded-lg p-3">
                  <h3 className="font-medium text-[#4a3728] text-sm mb-2">🎯 Set Reminders</h3>
                  <p className="text-xs text-[#8b7355]">
                    Add important deadlines to your calendar to stay on track.
                  </p>
                </div>
                <Link href="/applications?new=true">
                  <div className="border border-[#4a3728] rounded-lg p-3 hover:bg-[#f5ebe1] transition-colors cursor-pointer">
                    <h3 className="font-medium text-[#4a3728] text-sm mb-2">+ Create New Application</h3>
                    <p className="text-xs text-[#8b7355]">
                      Ready to start? Create a new application to get started.
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Right: Calendar */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Calendar
                </div>
                <Link href="/calendar">
                  <Button size="sm" variant="outline" className="text-xs">
                    View Full Calendar
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="text-[#8b7355] font-light">Loading calendar...</div>
              ) : !isCalendarConnected ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-[#8b7355] mx-auto mb-4" />
                  <p className="text-[#8b7355] font-light mb-4 text-sm">
                    Connect your Google Calendar to see your upcoming events.
                  </p>
                  <Link href="/calendar">
                    <Button size="sm" className="bg-[#4285f4] hover:bg-[#3367d6] text-white text-xs">
                      Connect Google Calendar
                    </Button>
                  </Link>
                </div>
              ) : calendarEvents.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[#8b7355] font-light text-sm">No upcoming events</p>
                  <Link href="/calendar">
                    <Button size="sm" variant="outline" className="mt-2 text-xs">
                      View Calendar
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {calendarEvents.map((event) => (
                    <div key={event.id} className="border border-[#e6d5c3] rounded-lg p-3">
                      <h3 className="font-medium text-[#4a3728] text-sm">{event.title}</h3>
                      <p className="text-xs text-[#8b7355]">
                        {new Date(event.start).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                        {event.location && ` - ${event.location}`}
                      </p>
                    </div>
                  ))}
                  <div className="text-center pt-2">
                    <Link href="/calendar">
                      <Button size="sm" variant="outline" className="text-xs">
                        View All Events
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}