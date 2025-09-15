import { FoundryEvent } from './calendar'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AuthResponse {
  message: string;
  user?: {
    id: string;
    email: string;
    email_confirmed_at?: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
  };
}

export interface ChatRequest {
  message: string
  essay_content: string
  context?: string
}

export interface ChatResponse {
  response: string
  suggestions?: string[]
  analysis?: {
    word_count?: number
    readability_score?: number
    tone_analysis?: string
    structure_feedback?: string
  }
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface GoogleSignInRequest {
  id_token: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signIn(data: SignInRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async googleSignIn(data: GoogleSignInRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signOut(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/signout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<{ user: any }> {
    return this.request<{ user: any }>('/auth/user');
  }

  async sendChatMessage(data: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat/analyze-essay', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async quickHelp(data: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat/quick-help', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getFoundryEvents(): Promise<FoundryEvent[]> {
    try {
      return this.request<FoundryEvent[]>('/api/events/foundry')
    } catch (error) {
      console.error('Error fetching Foundry events:', error)
      // Return mock data for demo purposes
      return [
        {
          event_name: "Tech Networking Night",
          event_date: "2024-01-20",
          event_time: "18:00",
          club_name: "TPEO",
          location: "GDC 1.304",
          description: "Connect with fellow engineers and product managers"
        },
        {
          event_name: "Design Workshop",
          event_date: "2024-01-22",
          event_time: "19:00", 
          club_name: "TPEO",
          location: "GDC 2.216",
          description: "Learn advanced UX/UI design principles"
        },
        {
          event_name: "Product Management 101",
          event_date: "2024-01-25",
          event_time: "20:00",
          club_name: "TPEO",
          location: "Virtual",
          description: "Introduction to product management fundamentals"
        }
      ]
    }
  }

  async syncFoundryWithCalendar(): Promise<{ success: boolean; message: string }> {
    try {
      return this.request<{ success: boolean; message: string }>('/api/events/sync-calendar', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Error syncing events:', error)
      return { success: false, message: 'Failed to sync events' }
    }
  }
}

export const apiClient = new ApiClient();