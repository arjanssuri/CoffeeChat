// Update your essay editor's chat functionality

// Add to frontend/lib/api.ts
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

class ApiClient {
  // ... existing methods

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
}

// Update your essay editor component
const sendChatMessage = async () => {
  if (!chatInput.trim() || !selectedEssay) return

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: chatInput,
    timestamp: new Date()
  }

  setChatMessages(prev => [...prev, userMessage])
  setChatInput("")
  setIsChatLoading(true)

  try {
    // Determine if this needs full Foundry analysis or quick help
    const isComplexQuery = chatInput.length > 50 || 
                          chatInput.includes('analyze') || 
                          chatInput.includes('feedback') ||
                          chatInput.includes('improve')

    const response = isComplexQuery 
      ? await apiClient.sendChatMessage({
          message: chatInput,
          essay_content: essayContent,
          context: 'college_essay'
        })
      : await apiClient.quickHelp({
          message: chatInput,
          essay_content: essayContent
        })

    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.response,
      timestamp: new Date(),
      suggestions: response.suggestions,
      analysis: response.analysis
    }

    setChatMessages(prev => [...prev, aiResponse])
  } catch (error) {
    console.error('Error sending message:', error)
    const errorResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Sorry, I encountered an error while analyzing your essay. Please try again.',
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, errorResponse])
  } finally {
    setIsChatLoading(false)
  }
}

// Enhanced chat message display with analysis
const ChatMessageComponent = ({ message }: { message: ChatMessage }) => (
  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[80%] p-3 rounded-lg ${
      message.role === 'user'
        ? 'bg-[#4a3728] text-white'
        : 'bg-white/80 text-[#4a3728] border border-[#e6d5c3]'
    }`}>
      <p className="text-sm">{message.content}</p>
      
      {/* Show suggestions if available */}
      {message.suggestions && message.suggestions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#e6d5c3]">
          <p className="text-xs font-medium mb-1">Suggestions:</p>
          <ul className="text-xs space-y-1">
            {message.suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-[#4a3728] mr-1">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Show analysis if available */}
      {message.analysis && Object.keys(message.analysis).length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#e6d5c3]">
          <p className="text-xs font-medium mb-1">Analysis:</p>
          <div className="text-xs space-y-1">
            {message.analysis.word_count && (
              <div>Words: {message.analysis.word_count}</div>
            )}
            {message.analysis.readability_score && (
              <div>Readability: {message.analysis.readability_score}/10</div>
            )}
            {message.analysis.tone_analysis && (
              <div>Tone: {message.analysis.tone_analysis}</div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
)