"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, FileText, Upload, X, Building, Plus } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import Image from "next/image"

export default function Profile() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [resumeUploaded, setResumeUploaded] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [applicationsWithOrgs, setApplicationsWithOrgs] = useState<any[]>([])
  const [organizationsApplyingTo, setOrganizationsApplyingTo] = useState<any[]>([])
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchProfileData()
    }
  }, [user])

  const fetchProfileData = async () => {
    setIsLoadingProfile(true)
    try {
      // Fetch user profile
      const response = await fetch(`http://localhost:8000/api/users/${user?.id}/profile`)
      if (response.ok) {
        const profileData = await response.json()
        setUserProfile(profileData.profile)
      }

      // Check resume status
      await checkResumeStatus()

      // Fetch applications with organizations
      await fetchApplicationsWithOrgs()

    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const fetchAvailableOrganizations = useCallback(async () => {
    if (!userProfile?.school_id) return

    try {
      const response = await fetch(`http://localhost:8000/api/organizations/${userProfile.school_id}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableOrgs(data.organizations || [])
      }
    } catch (error) {
      console.error('Error fetching available organizations:', error)
    }
  }, [userProfile?.school_id])

  // Fetch organizations after profile is loaded
  useEffect(() => {
    if (userProfile?.school_id) {
      fetchAvailableOrganizations()
    }
  }, [userProfile?.school_id, fetchAvailableOrganizations])

  const checkResumeStatus = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/${user?.id}/resume/status`)
      if (response.ok) {
        const data = await response.json()
        setResumeUploaded(data.uploaded || false)
      }
    } catch (error) {
      console.error('Error checking resume status:', error)
      setResumeUploaded(false)
    }
  }

  const fetchApplicationsWithOrgs = async () => {
    try {
      // Fetch all applications
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user?.id)

      if (appsError) {
        console.error('Error fetching applications:', appsError)
        return
      }

      // For each application, fetch organization details
      const appsWithOrgs = await Promise.all(
        (apps || []).map(async (app) => {
          try {
            const orgResponse = await fetch(`http://localhost:8000/api/organizations/search?q=${encodeURIComponent(app.title)}`)
            if (orgResponse.ok) {
              const orgData = await orgResponse.json()
              const org = orgData.organizations?.[0]
              return {
                ...app,
                organization: org
              }
            }
          } catch (error) {
            console.error('Error fetching org data:', error)
          }
          return app
        })
      )

      setApplicationsWithOrgs(appsWithOrgs)

      // Extract unique organizations from applications
      const uniqueOrgs = appsWithOrgs
        .filter(app => app.organization)
        .reduce((acc, app) => {
          const existingOrg = acc.find(org => org.id === app.organization.id)
          if (!existingOrg) {
            acc.push({
              ...app.organization,
              deadline: app.deadline
            })
          } else if (app.deadline && (!existingOrg.deadline || new Date(app.deadline) < new Date(existingOrg.deadline))) {
            existingOrg.deadline = app.deadline
          }
          return acc
        }, [] as any[])

      setOrganizationsApplyingTo(uniqueOrgs)
    } catch (error) {
      console.error('Error fetching applications with orgs:', error)
    }
  }

  const indexOrganizations = async () => {
    setIsIndexing(true)
    // Simulate indexing for 5 seconds
    setTimeout(() => {
      setIsIndexing(false)
      // Refetch applications with organization data
      fetchApplicationsWithOrgs()
    }, 5000)
  }


  const handleAddOrganization = async () => {
    if (!selectedOrgId) return

    try {
      const selectedOrg = availableOrgs.find(org => org.id === selectedOrgId)
      if (!selectedOrg) return

      // Check if user already has applications for this organization
      const existingAppForOrg = applicationsWithOrgs.some(app =>
        app.organization && app.organization.id === selectedOrgId
      )

      // If it's a new organization, trigger indexing simulation
      if (!existingAppForOrg) {
        setIsIndexing(true)
        // Simulate indexing for 5 seconds
        setTimeout(() => {
          setIsIndexing(false)
        }, 5000)
      }

      // Create a new application for this organization
      const { data, error } = await supabase
        .from('applications')
        .insert([
          {
            user_id: user?.id,
            title: selectedOrg.name,
            school: userProfile?.school_name || '',
            status: 'draft',
            deadline: selectedOrg.application_deadline || null
          }
        ])
        .select()

      if (error) {
        console.error('Error creating application:', error)
      } else {
        console.log('Application created successfully')
        setSelectedOrgId("")
        // Refresh applications
        fetchApplicationsWithOrgs()
      }
    } catch (error) {
      console.error('Error adding organization:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setResumeFile(file)
    } else {
      alert("Please select a PDF file")
    }
  }

  const handleResumeUpload = async () => {
    if (!resumeFile || !user?.id) return

    setIsUploadingResume(true)
    try {
      const formData = new FormData()
      formData.append("file", resumeFile)

      const response = await fetch(`http://localhost:8000/api/users/${user.id}/resume`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        console.log("Resume uploaded successfully")
        // Clear the file after successful upload
        setResumeFile(null)
        // Reset file input
        const fileInput = document.getElementById("resume-upload") as HTMLInputElement
        if (fileInput) fileInput.value = ""
        // Update resume status
        setResumeUploaded(true)
      } else {
        console.error("Failed to upload resume")
        alert("Failed to upload resume. Please try again.")
      }
    } catch (error) {
      console.error("Error uploading resume:", error)
      alert("Error uploading resume. Please try again.")
    } finally {
      setIsUploadingResume(false)
    }
  }

  const removeResumeFile = () => {
    setResumeFile(null)
    const fileInput = document.getElementById("resume-upload") as HTMLInputElement
    if (fileInput) fileInput.value = ""
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  if (loading || isLoadingProfile) {
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
              <Link
                href="/profile"
                className="text-[#8b7355] hover:text-[#4a3728] font-light"
              >
                Profile
              </Link>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Link href="/profile" className="flex items-center space-x-2 text-sm font-medium text-[#4a3728] hover:text-[#8b7355]">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="bg-[#4a3728] text-white text-sm">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span>{userName}</span>
                  </Link>
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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
                Profile Settings
              </h1>
              <p className="text-[#8b7355] font-light">
                Manage your profile, resume, and application settings
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  {resumeUploaded && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      ✓ Resume uploaded
                    </p>
                  )}
                </div>
              </div>

              {userProfile?.school_logo_url && (
                <div className="flex justify-center pt-4">
                  <Image
                    src={userProfile.school_logo_url}
                    alt={userProfile.school_name || "School"}
                    width={120}
                    height={120}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resume Management */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Resume Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeUploaded && !resumeFile ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-700" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Resume Uploaded</p>
                      <p className="text-xs text-green-600">
                        Your resume is stored and ready for AI analysis.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('resume-upload')?.click()}
                  >
                    Replace
                  </Button>
                  <input
                    id="resume-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <>
                  {/* PDF Resume Upload */}
                  {!resumeFile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="resume-upload-new"
                          className="flex flex-col items-center justify-center w-full h-24 border-2 border-[#e6d5c3] border-dashed rounded-lg cursor-pointer bg-[#f9f5f0] hover:bg-[#f5ebe1] transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-3 pb-3">
                            <Upload className="w-6 h-6 mb-1 text-[#8b7355]" />
                            <p className="text-xs text-[#4a3728]">
                              <span className="font-medium">Upload PDF</span> (optional)
                            </p>
                          </div>
                          <input
                            id="resume-upload-new"
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-[#f5ebe1] rounded-lg border border-[#e6d5c3]">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-[#4a3728]" />
                          <div>
                            <p className="text-sm font-medium text-[#4a3728]">{resumeFile.name}</p>
                            <p className="text-xs text-[#8b7355]">
                              {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeResumeFile}
                          className="p-1 hover:bg-[#e6d5c3] rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-[#8b7355]" />
                        </button>
                      </div>

                      <Button
                        type="button"
                        onClick={handleResumeUpload}
                        disabled={isUploadingResume}
                        className="w-full bg-[#8b7355] hover:bg-[#6d5a42] text-white font-light"
                      >
                        {isUploadingResume ? "Uploading..." : "Upload Resume"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Organization Management */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Organization Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Organization */}
              <div className="space-y-3">
                <Label className="text-[#4a3728] font-medium">
                  Add Organization to Apply To
                </Label>
                <div className="flex space-x-2">
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="flex-1 h-10 rounded-md border border-[#e6d5c3] bg-background px-3 py-2 text-sm focus:border-[#4a3728] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select an organization...</option>
                    {availableOrgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.type})
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAddOrganization}
                    disabled={!selectedOrgId}
                    size="sm"
                    className="bg-[#4a3728] hover:bg-[#3d2e21] text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Index Organizations */}
              <div className="pt-4 border-t border-[#e6d5c3]">
                <p className="text-[#8b7355] font-light text-sm mb-3">
                  Keep your organization data up to date by indexing the latest information.
                </p>
                <Button
                  onClick={indexOrganizations}
                  disabled={isIndexing}
                  className="w-full bg-[#4a3728] hover:bg-[#3d2e21] text-white"
                >
                  Index Organizations
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organizations Applying To */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Organizations Applying To
              </CardTitle>
            </CardHeader>
            <CardContent>
              {organizationsApplyingTo.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[#8b7355] font-light mb-4">No organizations selected yet.</p>
                  <p className="text-xs text-[#8b7355]">Add organizations above to see them listed here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {organizationsApplyingTo.map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-3 border border-[#e6d5c3] rounded-lg hover:bg-[#f5ebe1] transition-colors">
                      <div className="flex-1">
                        <h3 className="font-medium text-[#4a3728] text-sm">{org.name}</h3>
                        <p className="text-xs text-[#8b7355] mt-1">
                          {org.type} • {org.school_name || 'UT Austin'}
                        </p>
                      </div>
                      {org.deadline && (
                        <div className="text-right">
                          <p className="text-xs text-[#8b7355]">
                            Deadline: {new Date(org.deadline).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Applications Overview */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
            <CardHeader>
              <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Your Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applicationsWithOrgs.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[#8b7355] font-light mb-4">No applications yet.</p>
                  <Link href="/applications?new=true">
                    <Button className="bg-[#4a3728] hover:bg-[#3d2e21] text-white">
                      Create Your First Application
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {applicationsWithOrgs.slice(0, 3).map((app) => (
                    <Link key={app.id} href={`/applications/${app.id}/edit`}>
                      <div className="border border-[#e6d5c3] rounded-lg p-3 hover:bg-[#f5ebe1] transition-colors cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-[#4a3728] text-sm">{app.title}</h3>
                            {app.organization && (
                              <p className="text-xs text-[#8b7355] mt-1">
                                {app.organization.type} • {app.organization.school_name || 'UT Austin'}
                              </p>
                            )}
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
                  {applicationsWithOrgs.length > 3 && (
                    <div className="text-center">
                      <Link href="/applications">
                        <Button variant="outline" size="sm" className="text-xs">
                          View All Applications
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Indexing Modal Overlay */}
      {isIndexing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-[#4a3728] border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-[#4a3728] mb-2">
                Indexing Organizations
              </h3>
              <p className="text-[#8b7355] text-sm">
                Indexing websites for latest events and data...
              </p>
              <p className="text-xs text-[#8b7355] mt-2">
                This will take about 5 seconds
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}