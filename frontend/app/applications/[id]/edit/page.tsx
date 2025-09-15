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
import { ArrowLeft, Plus, MessageCircle, Save, FileText } from "lucide-react"
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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchApplication()
    }
  }, [user, params.id])

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

    setChatMessages(prev => [...prev, userMessage])
    setChatInput("")
    setIsChatLoading(true)

    try {
      // Mock AI response - in a real app, you'd call an AI API
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: generateMockAIResponse(userMessage.content),
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, aiResponse])
        setIsChatLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error sending message:', error)
      setIsChatLoading(false)
    }
  }

  const generateMockAIResponse = (userMessage: string): string => {
    const responses = [
      "That's a great point! Let me help you expand on that idea. Consider adding more specific examples to support your argument.",
      "I notice you could strengthen this section by being more specific. What particular experiences led to this realization?",
      "This is a solid foundation. Have you considered how this connects to your future goals? Admissions officers love to see that connection.",
      "Your writing style is engaging! To make it even better, try varying your sentence structure a bit more.",
      "This topic has great potential. What makes your perspective unique compared to other applicants who might write about similar experiences?",
      "I can help you with the grammar and flow. Let me suggest a few revisions to make this paragraph even stronger."
    ]
    return responses[Math.floor(Math.random() * responses.length)]
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
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedEssay?.id === essay.id
                    ? 'bg-[#4a3728] text-white'
                    : 'bg-white/80 hover:bg-[#f5ebe1] text-[#4a3728]'
                }`}
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
                <h2 className="text-xl font-light text-[#4a3728] mb-1">{selectedEssay.title}</h2>
                {selectedEssay.prompt && (
                  <p className="text-sm text-[#8b7355] bg-[#f5ebe1] p-2 rounded">
                    <strong>Prompt:</strong> {selectedEssay.prompt}
                  </p>
                )}
              </div>
              
              <div className="flex-1 p-4">
                <Textarea
                  value={essayContent}
                  onChange={(e) => setEssayContent(e.target.value)}
                  className="w-full h-full resize-none border-[#e6d5c3] focus:border-[#4a3728] text-[#4a3728]"
                  placeholder="Start writing your essay..."
                />
              </div>
              
              <div className="bg-white/80 border-t border-[#e6d5c3] p-2 text-center">
                <span className="text-sm text-[#8b7355]">
                  {essayContent.trim().split(/\s+/).filter(word => word.length > 0).length} words
                </span>
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
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-[#4a3728] text-white'
                      : 'bg-white/80 text-[#4a3728] border border-[#e6d5c3]'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
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
            <div className="flex space-x-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Ask for help with your essay..."
                className="flex-1 border-[#e6d5c3] focus:border-[#4a3728]"
              />
              <Button 
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || isChatLoading}
                size="sm"
                className="bg-[#4a3728] hover:bg-[#3d2e21] text-white"
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