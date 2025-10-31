import { NextRequest, NextResponse } from 'next/server'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
  essayContent?: string
  applicationTitle?: string
  essayTitle?: string
  essayPrompt?: string
  selectedText?: string
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { messages, essayContent, applicationTitle, essayTitle, essayPrompt, selectedText, userId }: RequestBody = await request.json()

    // Get user profile data for context
    let userProfileContext = ""
    if (userId) {
      try {
        const profileResponse = await fetch(`http://localhost:8000/api/users/${userId}/profile`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          const profile = profileData.profile
          if (profile) {
            userProfileContext = `
User Profile Context:
- Name: ${profile.first_name} ${profile.last_name}
- School: ${profile.school_name || 'N/A'}
- Major: ${profile.major || 'N/A'}
- Graduation Year: ${profile.graduation_year || 'N/A'}
- Resume: ${profile.resume_text || 'No resume provided'}
`
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }

    // Get organization data for context
    let organizationContext = ""
    if (applicationTitle) {
      try {
        // Fetch organization data from your backend
        const orgResponse = await fetch(`http://localhost:8000/api/organizations/search?q=${encodeURIComponent(applicationTitle)}`)
        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          if (orgData.organizations && orgData.organizations.length > 0) {
            const org = orgData.organizations[0]
            organizationContext = `
Organization Context:
- Name: ${org.name}
- Type: ${org.type}
- Description: ${org.description || 'N/A'}
- Application Requirements: ${org.application_requirements || 'N/A'}
- Application Deadline: ${org.application_deadline || 'N/A'}
- Contact Email: ${org.contact_email || 'N/A'}
- Website: ${org.website_url || 'N/A'}
`
          }
        }
      } catch (error) {
        console.error('Error fetching organization data:', error)
      }
    }

    // Build context for Claude
    const systemPrompt = `You are Goose, a concise essay writing assistant. You can write or modify essays using tools.

${userProfileContext}

${organizationContext}

Essay Context:
- Application: ${applicationTitle || 'N/A'}
- Essay Title: ${essayTitle || 'N/A'}
- Essay Prompt: ${essayPrompt || 'N/A'}
- Current Content: ${essayContent || 'No content yet'}
${selectedText ? `- Selected Text: "${selectedText}"` : ''}

Available tools:
- write_essay: Write a complete essay from scratch
- modify_essay: Improve or modify existing essay content
- index_organization: Analyze organization when first asked about it
- read_profile: Display user profile information when asked about their background

Rules:
- NEVER make up or hallucinate information about organizations or users
- Only use information provided in the contexts above
- If you don't have specific info, say so honestly
- When asked about the organization for the first time, use index_organization tool
- When asked about user's background/profile, use read_profile tool to display it as a card
- When asked to write/improve essays, use the essay tools and reference the user's resume/profile
- Use the user's resume content to personalize essays and highlight relevant experiences
- Otherwise, give brief advice (1-2 sentences max)`

    // Prepare messages for Claude
    const claudeMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Define tools for Claude
    const tools = [
      {
        name: "write_essay",
        description: "Write a complete essay from scratch based on the prompt",
        input_schema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The complete essay content"
            }
          },
          required: ["content"]
        }
      },
      {
        name: "modify_essay",
        description: "Improve or modify existing essay content",
        input_schema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The improved essay content"
            }
          },
          required: ["content"]
        }
      },
      {
        name: "index_organization",
        description: "Index and analyze organization data when first asked about it",
        input_schema: {
          type: "object",
          properties: {
            analysis: {
              type: "string",
              description: "Analysis of the organization including culture, values, ideal candidates"
            },
            tips: {
              type: "array",
              items: { type: "string" },
              description: "Specific tips for writing essays for this organization"
            }
          },
          required: ["analysis", "tips"]
        }
      },
      {
        name: "read_profile",
        description: "Display user profile information as a card when asked about their background",
        input_schema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "A brief summary of the user's profile and background"
            }
          },
          required: ["summary"]
        }
      },
      {
        name: "fetch_resume",
        description: "Fetch and display the user's resume content to reference when writing essays",
        input_schema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Description of what the resume is being used for"
            }
          },
          required: ["action"]
        }
      },
      {
        name: "fetch_organization_info",
        description: "Fetch detailed information about the organization being applied to",
        input_schema: {
          type: "object",
          properties: {
            organization_name: {
              type: "string",
              description: "Name of the organization to fetch information for"
            },
            purpose: {
              type: "string",
              description: "Purpose of fetching the organization info"
            }
          },
          required: ["organization_name", "purpose"]
        }
      }
    ]

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: claudeMessages,
        tools: tools
      })
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`)
    }

    const data = await response.json()

    let assistantResponse = ''
    let essayEdit = null
    let organizationIndex = null
    let profileCard = null
    let resumeCard = null
    let organizationCard = null

    // Handle different content types
    for (const content of data.content) {
      if (content.type === 'text') {
        assistantResponse += content.text
      } else if (content.type === 'tool_use') {
        // Handle tool calls
        const toolName = content.name
        const toolInput = content.input

        if (toolName === 'write_essay' || toolName === 'modify_essay') {
          essayEdit = {
            type: toolName === 'write_essay' ? 'write' : 'modify',
            content: toolInput.content
          }
          assistantResponse += `I've prepared ${toolName === 'write_essay' ? 'a complete essay' : 'improvements to your essay'}. Review and accept/reject the changes.`
        } else if (toolName === 'index_organization') {
          organizationIndex = {
            analysis: toolInput.analysis,
            tips: toolInput.tips
          }
          assistantResponse += "I've analyzed this organization for you based on the available data."
        } else if (toolName === 'read_profile') {
          profileCard = {
            summary: "Read User Profile"
          }
          assistantResponse += "I have read the user's profile."
        } else if (toolName === 'fetch_resume') {
          resumeCard = {
            action: toolInput.action,
            content: userProfileContext.includes('Resume:') ? userProfileContext.split('Resume: ')[1] : 'No resume content available'
          }
          assistantResponse += `Fetching your resume to ${toolInput.action.toLowerCase()}...`
        } else if (toolName === 'fetch_organization_info') {
          organizationCard = {
            name: toolInput.organization_name,
            purpose: toolInput.purpose,
            info: organizationContext || `Fetching information for ${toolInput.organization_name}...`
          }
          assistantResponse += `Fetching ${toolInput.organization_name} information...`
        }
      }
    }

    // Default response if no text content
    if (!assistantResponse) {
      assistantResponse = "I'm ready to help with your essay!"
    }

    return NextResponse.json({
      response: assistantResponse,
      essayEdit: essayEdit,
      organizationIndex: organizationIndex,
      profileCard: profileCard,
      resumeCard: resumeCard,
      organizationCard: organizationCard
    })

  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}