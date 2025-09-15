const GOOGLE_CALENDAR_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY || 'AIzaSyDo8s_lpVRAOTllM4nmsfPUZguyoa7n7LM'
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '365589324014-bg78db2hlo5j11nclsiikujc9v5nhk0k.apps.googleusercontent.com'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  location?: string
  club?: string
}

export interface FoundryEvent {
  event_name: string
  event_date: string
  event_time: string
  club_name: string
  location?: string
  description?: string
}

export class CalendarService {
  private gapi: any = null
  private isInitialized = false
  private accessToken: string | null = null
  private tokenExpiry: number = 0
  private isAuthenticating = false

  private async initializeGapi() {
    if (typeof window === 'undefined') return false

    if (this.isInitialized) return true

    try {
      console.log('Initializing Google API...')
      console.log('Client ID:', GOOGLE_CLIENT_ID)
      console.log('Current origin:', window.location.origin)

      // Load Google Identity Services script instead
      if (!window.google) {
        console.log('Loading Google Identity Services...')
        await this.loadGoogleIdentityScript()
      }

      // Load Google API script
      if (!window.gapi) {
        console.log('Loading Google API script...')
        await this.loadGapiScript()
      }

      console.log('Loading client...')
      await new Promise((resolve) => {
        window.gapi.load('client', resolve)
      })

      console.log('Initializing client...')
      await window.gapi.client.init({
        apiKey: GOOGLE_CALENDAR_API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
      })

      console.log('Google API initialized successfully!')
      this.gapi = window.gapi
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Error initializing Google API:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return false
    }
  }

  private loadGapiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  private loadGoogleIdentityScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  private async requestAccessToken(): Promise<string | null> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    // Prevent multiple simultaneous auth requests
    if (this.isAuthenticating) {
      console.log('Authentication already in progress, waiting...')
      // Wait for current auth to complete
      while (this.isAuthenticating) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return this.accessToken
    }

    this.isAuthenticating = true

    return new Promise((resolve) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
        callback: (response: any) => {
          this.isAuthenticating = false
          if (response.access_token) {
            this.accessToken = response.access_token
            // Set expiry to 50 minutes (tokens typically last 1 hour)
            this.tokenExpiry = Date.now() + (50 * 60 * 1000)
            console.log('Access token obtained and cached')
            resolve(response.access_token)
          } else {
            console.error('Failed to get access token:', response)
            resolve(null)
          }
        }
      })
      tokenClient.requestAccessToken()
    })
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiry
  }

  clearAuth(): void {
    this.accessToken = null
    this.tokenExpiry = 0
    this.isAuthenticating = false
  }

  async getEvents(calendarId: string = 'primary'): Promise<CalendarEvent[]> {
    try {
      const initialized = await this.initializeGapi()
      if (!initialized) return []

      // Get access token
      const token = await this.requestAccessToken()
      if (!token) {
        console.log('User denied access or failed to get token')
        return []
      }

      // Set the access token
      this.gapi.client.setToken({ access_token: token })

      const response = await this.gapi.client.calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      })

      return response.result.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || 'No Title',
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
      })) || []
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      return []
    }
  }

  async createEvent(event: Partial<CalendarEvent>, calendarId: string = 'primary'): Promise<string | null> {
    try {
      const initialized = await this.initializeGapi()
      if (!initialized) return null

      // Get access token
      const token = await this.requestAccessToken()
      if (!token) {
        console.log('User denied access or failed to get token')
        return null
      }

      // Set the access token
      this.gapi.client.setToken({ access_token: token })

      const response = await this.gapi.client.calendar.events.insert({
        calendarId,
        resource: {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start,
            timeZone: 'America/Chicago',
          },
          end: {
            dateTime: event.end,
            timeZone: 'America/Chicago',
          },
          location: event.location,
        },
      })

      return response.result.id || null
    } catch (error) {
      console.error('Error creating calendar event:', error)
      return null
    }
  }

  convertFoundryEventToCalendar(foundryEvent: FoundryEvent): Partial<CalendarEvent> {
    const eventDate = new Date(`${foundryEvent.event_date} ${foundryEvent.event_time}`)
    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000) // Default 1 hour duration

    return {
      title: `${foundryEvent.club_name}: ${foundryEvent.event_name}`,
      description: foundryEvent.description || `Event hosted by ${foundryEvent.club_name}`,
      start: eventDate.toISOString(),
      end: endDate.toISOString(),
      location: foundryEvent.location,
      club: foundryEvent.club_name,
    }
  }
}

export const calendarService = new CalendarService()