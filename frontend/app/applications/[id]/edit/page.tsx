"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, MessageCircle, Save, FileText, Edit3, Check, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Application {
  id: string
  title: string
  school: string
  deadline: string
  status: 'draft' | 'in-progress' | 'submitted'
  user_id: string
}

interface Essay {
  id: string
  application_id: string
  title: string
  prompt: string
  content: string
  word_count: number
  created_at: string
  updated_at: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  pendingEdit?: {
    type: 'write' | 'modify'
    content: string
    original?: string
  } | null
  organizationIndex?: {
    analysis: string
    tips: string[]
  } | null
  profileCard?: {
    summary: string
  } | null
  resumeCard?: {
    action: string
    content: string
  } | null
  organizationCard?: {
    name: string
    purpose: string
    info: string
  } | null
}

export default function ApplicationEditor({ params }: { params: { id: string } }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [essays, setEssays] = useState<Essay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null)
  const [essayContent, setEssayContent] = useState("")
  const [showNewEssayDialog, setShowNewEssayDialog] = useState(false)
  const [newEssay, setNewEssay] = useState({ title: "", prompt: "" })
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m Goose, your AI writing assistant. I can help you brainstorm ideas, improve your writing, check grammar, and provide feedback. What would you like to work on?',
      timestamp: new Date()
    }
  ])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)

  // Prompt editing state
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState("")

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")

  // Text selection state
  const [selectedText, setSelectedText] = useState("")

  // Word limit state
  const [wordLimit, setWordLimit] = useState<number | null>(null)

  // Calculate word count
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  const currentWordCount = getWordCount(essayContent)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchApplication().then(() => {
        loadChatHistory()
      })
    }
  }, [user, params.id])

  const loadChatHistory = async () => {
    if (!user || !params.id) return

    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('application_id', params.id)
        .single()

      if (data) {
        console.log("Loaded chat history:", data.messages)
        setChatMessages(data.messages)
        setChatId(data.id)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const saveChatHistory = async (messages: ChatMessage[]) => {
    if (!user || !params.id) return

    try {
      const { data, error } = await supabase
        .from('chats')
        .upsert({
          id: chatId,
          user_id: user.id,
          application_id: params.id,
          messages: messages,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (data) {
        setChatId(data.id)
      }

      if (error) {
        console.error('Error saving chat history:', error)
      } else {
        console.log('Chat history saved:', messages)
      }
    } catch (error) {
      console.error('Error saving chat history:', error)
    }
  }

  const fetchApplication = async () => {
    try {
      const { data: app, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user?.id)
        .single()

      if (appError) {
        console.error('Error fetching application:', appError)
        router.push('/applications')
        return
      }

      setApplication(app)

      const { data: essaysData, error: essaysError } = await supabase
        .from('essays')
        .select('*')
        .eq('application_id', params.id)
        .order('created_at', { ascending: true })

      if (essaysError) {
        console.error('Error fetching essays:', essaysError)
      } else {
        setEssays(essaysData || [])
        if (essaysData && essaysData.length > 0) {
          setSelectedEssay(essaysData[0])
          setEssayContent(essaysData[0].content)
        }
      }
    } catch (error) {
      console.error('Error fetching application:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createEssay = async () => {
    if (!newEssay.title || !application) return

    try {
      const { data, error } = await supabase
        .from('essays')
        .insert({
          application_id: application.id,
          title: newEssay.title,
          prompt: newEssay.prompt,
          content: ''
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating essay:', error)
        return
      }

      setEssays(prev => [...prev, data])
      setSelectedEssay(data)
      setEssayContent('')
      setNewEssay({ title: "", prompt: "" })
      setShowNewEssayDialog(false)
    } catch (error) {
      console.error('Error creating essay:', error)
    }
  }

  const saveEssay = async () => {
    if (!selectedEssay) return

    try {
      const { error } = await supabase
        .from('essays')
        .update({ content: essayContent })
        .eq('id', selectedEssay.id)

      if (error) {
        console.error('Error saving essay:', error)
        return
      }

      // Update local state
      setEssays(prev => prev.map(essay => 
        essay.id === selectedEssay.id 
          ? { ...essay, content: essayContent }
          : essay
      ))

      // Show success feedback
      const saveButton = document.getElementById('save-button')
      if (saveButton) {
        const originalText = saveButton.textContent
        saveButton.textContent = 'Saved!'
        setTimeout(() => {
          saveButton.textContent = originalText
        }, 2000)
      }
    } catch (error) {
      console.error('Error saving essay:', error)
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    }

    const newMessages = [...chatMessages, userMessage]
    setChatMessages(newMessages)
    setChatInput("")
    setSelectedText("") // Clear selected text after sending
    setIsChatLoading(true)

    try {
      // Call Claude AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          essayContent: essayContent,
          applicationTitle: application?.title,
          essayTitle: selectedEssay?.title,
          essayPrompt: selectedEssay?.prompt,
          selectedText: selectedText,
          userId: user?.id
        })
      })

      if (response.ok) {
        const data = await response.json()

        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          pendingEdit: data.essayEdit,
          organizationIndex: data.organizationIndex,
          profileCard: data.profileCard,
          resumeCard: data.resumeCard,
          organizationCard: data.organizationCard
        }
        
        const finalMessages = [...newMessages, aiResponse]
        setChatMessages(finalMessages)

        // Save chat history
        await saveChatHistory(finalMessages)

        // Scroll to bottom of chat after message is added
        setTimeout(() => {
          const chatContainer = document.getElementById('chat-messages')
          if (chatContainer) {
            chatContainer.scrollTo({
              top: chatContainer.scrollHeight,
              behavior: 'smooth'
            })
          }
        }, 100)
      } else {
        throw new Error('Failed to get AI response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorResponse])
    } finally {
      setIsChatLoading(false)
    }
  }

  const startEditingPrompt = () => {
    if (selectedEssay) {
      setEditedPrompt(selectedEssay.prompt || "")
      setIsEditingPrompt(true)
    }
  }

  const cancelEditingPrompt = () => {
    setIsEditingPrompt(false)
    setEditedPrompt("")
  }

  const savePrompt = async () => {
    if (!selectedEssay) return

    try {
      const { error } = await supabase
        .from('essays')
        .update({ prompt: editedPrompt })
        .eq('id', selectedEssay.id)

      if (error) {
        console.error('Error saving prompt:', error)
        return
      }

      // Update local state
      setEssays(prev => prev.map(essay =>
        essay.id === selectedEssay.id
          ? { ...essay, prompt: editedPrompt }
          : essay
      ))
      setSelectedEssay(prev => prev ? { ...prev, prompt: editedPrompt } : null)
      setIsEditingPrompt(false)
      setEditedPrompt("")
    } catch (error) {
      console.error('Error saving prompt:', error)
    }
  }

  const startEditingTitle = () => {
    if (selectedEssay) {
      setEditedTitle(selectedEssay.title)
      setIsEditingTitle(true)
    }
  }

  const cancelEditingTitle = () => {
    setIsEditingTitle(false)
    setEditedTitle("")
  }

  const saveTitle = async () => {
    if (!selectedEssay) return

    try {
      const { error } = await supabase
        .from('essays')
        .update({ title: editedTitle })
        .eq('id', selectedEssay.id)

      if (error) {
        console.error('Error saving title:', error)
        return
      }

      // Update local state
      setEssays(prev => prev.map(essay =>
        essay.id === selectedEssay.id
          ? { ...essay, title: editedTitle }
          : essay
      ))
      setSelectedEssay(prev => prev ? { ...prev, title: editedTitle } : null)
      setIsEditingTitle(false)
      setEditedTitle("")
    } catch (error) {
      console.error('Error saving title:', error)
    }
  }

  const acceptEssayEdit = (content: string) => {
    setEssayContent(content)
    setChatMessages(prev => prev.map(msg => ({ ...msg, pendingEdit: null })))
  }

  const rejectEssayEdit = () => {
    setChatMessages(prev => prev.map(msg => ({ ...msg, pendingEdit: null })))
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
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

  if (!user || !application) {
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
            <div className="flex items-center space-x-4">
              <Link href="/applications" className="text-[#8b7355] hover:text-[#4a3728]">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Link href="/dashboard" className="flex items-center space-x-3">
                <Image src="/images/goose-logo.png" alt="CoffeeChat Logo" width={40} height={40} />
                <span className="text-xl font-light text-[#4a3728]">CoffeeChat</span>
              </Link>
              <div className="text-[#8b7355]">
                <span className="text-sm">Editing:</span>
                <span className="text-[#4a3728] font-medium ml-1">{application.title}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button onClick={saveEssay} id="save-button" className="bg-[#4a3728] hover:bg-[#3d2e21] text-white">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Link href="/profile">
                <Button variant="outline" className="border-[#e6d5c3] hover:bg-[#f5ebe1] text-[#4a3728] font-light">
                  Profile
                </Button>
              </Link>
              
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Essays */}
        <div className="w-80 bg-white/50 border-r border-[#e6d5c3] p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-[#4a3728]">Essays</h2>
            <Dialog open={showNewEssayDialog} onOpenChange={setShowNewEssayDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#4a3728] hover:bg-[#3d2e21] text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Essay</DialogTitle>
                  <DialogDescription>
                    Add a new essay to this application
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="essay-title">Essay Title</Label>
                    <Input
                      id="essay-title"
                      value={newEssay.title}
                      onChange={(e) => setNewEssay(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={`Essay #${essays.length + 1}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="essay-prompt">Prompt (Optional)</Label>
                    <Textarea
                      id="essay-prompt"
                      value={newEssay.prompt}
                      onChange={(e) => setNewEssay(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="What's a funny story about yourself?"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createEssay} disabled={!newEssay.title}>
                    Create Essay
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-2">
            {essays.map((essay) => (
              <div
                key={essay.id}
                onClick={() => {
                  setSelectedEssay(essay)
                  setEssayContent(essay.content)
                }}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedEssay?.id === essay.id
                    ? 'bg-[#4a3728] text-white'
                    : 'bg-white/80 hover:bg-[#f5ebe1] text-[#4a3728]'}`}
              >
                <h3 className="font-medium text-sm">{essay.title}</h3>
                <p className="text-xs opacity-75 mt-1">
                  {essay.word_count} words
                </p>
              </div>
            ))}
            
            {essays.length === 0 && (
              <div className="text-center py-8 text-[#8b7355]">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No essays yet</p>
                <p className="text-xs">Create your first essay</p>
              </div>
            )}
          </div>
        </div>

        {/* Center - Essay Editor */}
        <div className="flex-1 flex flex-col">
          {selectedEssay ? (
            <>
              <div className="bg-white/80 border-b border-[#e6d5c3] p-4">
                <div className="flex items-center justify-between mb-1">
                  {isEditingTitle ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="text-xl font-light border-[#e6d5c3] focus:border-[#4a3728]"
                      />
                      <Button
                        onClick={saveTitle}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={cancelEditingTitle}
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2
                        className="text-xl font-light text-[#4a3728] cursor-pointer hover:text-[#8b7355]"
                        onClick={startEditingTitle}
                      >
                        {selectedEssay.title}
                      </h2>
                      <Button
                        onClick={startEditingPrompt}
                        variant="ghost"
                        size="sm"
                        className="text-[#8b7355] hover:text-[#4a3728] hover:bg-[#f5ebe1]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {isEditingPrompt ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Textarea
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        className="flex-1 text-sm border-[#e6d5c3] focus:border-[#4a3728]"
                        rows={2}
                        placeholder="Enter essay prompt..."
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={savePrompt}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        onClick={cancelEditingPrompt}
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  selectedEssay.prompt && (
                    <p className="text-sm text-[#8b7355] bg-[#f5ebe1] p-2 rounded">
                      <strong>Prompt:</strong> {selectedEssay.prompt}
                    </p>
                  )
                )}
              </div>
              
              <div className="flex-1 p-4">
                <Textarea
                  value={essayContent}
                  onChange={(e) => setEssayContent(e.target.value)}
                  onMouseUp={handleTextSelection}
                  onKeyUp={handleTextSelection}
                  className="w-full h-full resize-none border-[#e6d5c3] focus:border-[#4a3728] text-[#4a3728]"
                  placeholder="Start writing your essay..."
                />
              </div>
              
              <div className="bg-white/80 border-t border-[#e6d5c3] p-2 flex justify-between items-center">
                <span className={`text-sm ${wordLimit && currentWordCount > wordLimit
                    ? 'text-red-600'
                    : wordLimit && currentWordCount > wordLimit * 0.9
                    ? 'text-yellow-600'
                    : 'text-[#8b7355]'}`}
                >
                  {currentWordCount} words{wordLimit ? ` / ${wordLimit}` : ''}
                </span>

                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="Word limit"
                    value={wordLimit || ''}
                    onChange={(e) => setWordLimit(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-24 h-6 text-xs border-[#e6d5c3]"
                  />
                  <span className="text-xs text-[#8b7355]">limit</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#8b7355]">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-light mb-2">Select an essay to start writing</h3>
                <p className="text-sm">Choose an essay from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - AI Chat */}
        <div className="w-80 bg-white/50 border-l border-[#e6d5c3] flex flex-col">
          <div className="p-4 border-b border-[#e6d5c3]">
            <h2 className="text-lg font-medium text-[#4a3728] flex items-center">
              <Image src="/images/goose-logo.png" alt="Goose" width={20} height={20} className="mr-2" />
              Goose AI Assistant
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat-messages">
            {chatMessages.map((message, index) => (
              <div key={`${message.id}-${index}`} className="space-y-2">
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user'
                        ? 'bg-[#4a3728] text-white'
                        : 'bg-white/80 text-[#4a3728] border border-[#e6d5c3]'}`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>

                {/* Show pending edit card if this is the most recent assistant message */}
                {message.role === 'assistant' && message.pendingEdit && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-[#f5ebe1] border border-[#e6d5c3] rounded-lg p-3 space-y-3">
                      <h4 className="text-sm font-medium text-[#4a3728]">
                        📝 Essay {message.pendingEdit.type === 'write' ? 'Draft' : 'Improvement'}
                      </h4>
                      <div className="max-h-32 overflow-y-auto p-2 bg-white rounded border text-xs text-[#4a3728]">
                        {message.pendingEdit.content}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => acceptEssayEdit(message.pendingEdit.content)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          onClick={rejectEssayEdit}
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50 flex-1"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show organization index card if this is the most recent assistant message */}
                {message.role === 'assistant' && message.organizationIndex && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                      <h4 className="text-sm font-medium text-blue-800">
                        🏢 Organization Analysis
                      </h4>
                      <div className="text-xs text-blue-700">
                        <p className="mb-2">{message.organizationIndex.analysis}</p>
                        <div>
                          <strong>Tips for your essay:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {message.organizationIndex.tips.map((tip, tipIndex) => (
                              <li key={tipIndex}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show profile card */}
                {message.role === 'assistant' && message.profileCard && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-green-50 border border-green-200 rounded-lg p-3 space-y-3">
                      <h4 className="text-sm font-medium text-green-800">
                        👤 User Profile
                      </h4>
                      <div className="text-xs text-green-700">
                        <p className="mb-2">{message.profileCard.summary}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show resume card */}
                {message.role === 'assistant' && message.resumeCard && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-green-50 border border-green-200 rounded-lg p-3 space-y-3">
                      <h4 className="text-sm font-medium text-green-800">
                        📄 Resume Analysis
                      </h4>
                      <div className="text-xs text-green-700">
                        <p className="mb-2">{message.resumeCard.action}</p>
                        <div className="max-h-32 overflow-y-auto p-2 bg-white rounded border text-xs text-gray-600">
                          {message.resumeCard.content}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/80 text-[#4a3728] border border-[#e6d5c3] p-3 rounded-lg">
                  <p className="text-sm">AI is typing...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-[#e6d5c3]">
            {selectedText && (
              <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <div className="text-blue-600 font-medium">Selected text:</div>
                <div className="text-blue-800 italic">"{selectedText}"</div>
              </div>
            )}
            <div className="flex space-x-2">
              <Textarea
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value)
                  // Auto-resize
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChatMessage()
                  }
                }}
                placeholder="Ask for help with your essay..."
                className="flex-1 border-[#e6d5c3] focus:border-[#4a3728] min-h-[40px] max-h-[120px] resize-none"
                rows={1}
                style={{
                  height: '40px'
                }}
                ref={(textarea) => {
                  // Reset height when chat input is cleared
                  if (textarea && !chatInput) {
                    textarea.style.height = '40px'
                  }
                }}
              />
              <Button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || isChatLoading}
                size="sm"
                className="bg-[#4a3728] hover:bg-[#3d2e21] text-white self-end"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}