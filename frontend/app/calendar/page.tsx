"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar as CalendarIcon, Plus, Bell } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { CalendarEvent, calendarService } from "@/lib/calendar"
import toast, { Toaster } from 'react-hot-toast'

const staticEvents: CalendarEvent[] = [
  { id: 'usit-1', title: 'USIT/QMI Application Opens', start: '2025-08-27T00:00:00', end: '2025-08-27T00:00:00' },
  { id: 'usit-2', title: 'USIT/QMI Info Session', start: '2025-08-27T19:00:00', end: '2025-08-27T20:00:00' },
  { id: 'usit-3', title: 'USIT/QMI Info Session', start: '2025-08-28T18:00:00', end: '2025-08-28T19:00:00' },
  { id: 'usit-4', title: 'USIT/QMI Coffee Chats', start: '2025-08-28T17:00:00', end: '2025-08-28T18:00:00' },
  { id: 'usit-5', title: 'USIT/QMI Coffee Chats', start: '2025-08-29T14:30:00', end: '2025-08-29T15:30:00' },
  { id: 'usit-6', title: 'USIT/QMI Coffee Chats', start: '2025-08-31T11:00:00', end: '2025-08-31T12:00:00' },
  { id: 'usit-7', title: 'USIT/QMI Women\'s Brunch', start: '2025-08-30T10:00:00', end: '2025-08-30T11:30:00' },
  { id: 'usit-8', title: 'USIT/QMI Application Closes', start: '2025-09-02T23:59:00', end: '2025-09-02T23:59:00' },
  { id: 'convergent-1', title: 'Texas Convergent Info Session #1', start: '2025-08-27T18:00:00', end: '2025-08-27T19:00:00' },
  { id: 'convergent-2', title: 'Texas Convergent Coffee Chat #1', start: '2025-08-27T17:00:00', end: '2025-08-27T19:00:00' },
  { id: 'convergent-3', title: 'Texas Convergent Info Session #2', start: '2025-09-02T19:00:00', end: '2025-09-02T20:00:00' },
  { id: 'convergent-4', title: 'Texas Convergent Coffee Chat #2', start: '2025-09-02T17:00:00', end: '2025-09-02T19:00:00' },
  { id: 'convergent-5', title: 'Texas Convergent Info Session #3', start: '2025-09-03T17:00:00', end: '2025-09-03T18:00:00' },
  { id: 'convergent-6', title: 'Texas Convergent Game Night Social', start: '2025-09-04T18:00:00', end: '2025-09-04T20:00:00' },
  { id: 'convergent-7', title: 'Texas Convergent Application Office Hours', start: '2025-09-05T10:00:00', end: '2025-09-05T12:00:00' },
  { id: 'convergent-8', title: 'Texas Convergent Application Deadline', start: '2025-09-05T23:59:00', end: '2025-09-05T23:59:00' },
];

export default function Calendar() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [isCalendarConnected, setIsCalendarConnected] = useState(false)
  const [addedEvents, setAddedEvents] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true)

        let allEvents: CalendarEvent[] = [];
        // Check if user is already authenticated to Google Calendar
        if (calendarService.isAuthenticated()) {
          const calendarEvents = await calendarService.getEvents()
          allEvents = [...allEvents, ...calendarEvents];
          setIsCalendarConnected(true)
        } else {
          // User not authenticated - don't trigger auth popup automatically
          setIsCalendarConnected(false)
        }

        setEvents(allEvents);

      } catch (error) {
        console.error('Error fetching events:', error)
        toast.error('Failed to load calendar events')
      } finally {
        setLoadingEvents(false)
      }
    }

    if (user) {
      fetchEvents()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const connectGoogleCalendar = async () => {
    try {
      // This will trigger Google sign-in and then fetch events
      const calendarEvents = await calendarService.getEvents()
      setEvents([...events, ...calendarEvents]);
      setIsCalendarConnected(true)
      toast.success('Google Calendar connected!')
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error)
      toast.error('Failed to connect to Google Calendar')
    }
  }

  const handleAddToCalendar = async (event: CalendarEvent) => {
    const eventKey = event.id;

    try {
      const eventId = await calendarService.createEvent(event)

      if (eventId) {
        toast.success('Event added to your calendar!')
        // Mark this event as added
        setAddedEvents(prev => new Set([...prev, eventKey]))
        // Refresh events
        const updatedEvents = await calendarService.getEvents()
        setEvents(updatedEvents)
        setIsCalendarConnected(true)
      } else {
        toast.error('Failed to add event to calendar')
      }
    } catch (error) {
      console.error('Error adding event:', error)
      toast.error('Failed to add event to calendar')
    }
  }

  const isEventAdded = (event: CalendarEvent): boolean => {
    const eventKey = event.id;
    return addedEvents.has(eventKey)
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
      <Toaster />
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
                className="text-[#4a3728] font-medium"
              >
                Calendar
              </Link>
              <Link
                href="/profile"
                className="text-[#8b7355] hover:text-[#4a3728] font-light"
              >
                Profile
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-[#4a3728] mb-2">
            Calendar & Events
          </h1>
          <p className="text-[#8b7355] font-light">
            Stay updated with club events and manage your schedule
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Club Events */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Club Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {staticEvents.length === 0 ? (
                <div className="text-[#8b7355] font-light">No upcoming club events</div>
              ) : (
                <div className="space-y-4">
                  {staticEvents.map((event, index) => (
                    <div key={index} className="border border-[#e6d5c3] rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-[#4a3728]">{event.title}</h3>
                      </div>
                      <p className="text-sm text-[#8b7355] mb-2">
                        {new Date(event.start).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                      {event.location && (
                        <p className="text-sm text-[#8b7355] mb-2">📍 {event.location}</p>
                      )}
                      {isEventAdded(event) ? (
                        <Button
                          size="sm"
                          disabled
                          className="bg-green-600 text-white cursor-not-allowed"
                        >
                          ✓ Added to Calendar
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAddToCalendar(event)}
                          size="sm"
                          className="bg-[#4a3728] hover:bg-[#3a2b1f] text-white"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add to Calendar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Calendar Events */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center justify-between">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Your Calendar
                </div>
                {!isCalendarConnected && (
                  <Button
                    onClick={connectGoogleCalendar}
                    size="sm"
                    className="bg-[#4285f4] hover:bg-[#3367d6] text-white"
                  >
                    Connect Google Calendar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="text-[#8b7355] font-light">Loading calendar...</div>
              ) : !isCalendarConnected && events.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-[#8b7355] mx-auto mb-4" />
                  <p className="text-[#8b7355] font-light mb-4">
                    Connect your Google Calendar to see your events and add club events directly to your schedule.
                  </p>
                  <Button
                    onClick={connectGoogleCalendar}
                    className="bg-[#4285f4] hover:bg-[#3367d6] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Google Calendar
                  </Button>
                </div>
              ) : events.length === 0 ? (
                <div className="text-[#8b7355] font-light">No upcoming events in your calendar</div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="border border-[#e6d5c3] rounded-lg p-4">
                      <h3 className="font-medium text-[#4a3728] mb-1">{event.title}</h3>
                      <p className="text-sm text-[#8b7355] mb-2">
                        {new Date(event.start).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                      {event.location && (
                        <p className="text-sm text-[#8b7355]">📍 {event.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
