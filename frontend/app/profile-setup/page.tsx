"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { User, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

interface School {
  id: string
  name: string
  domain: string
  location: string
  logo_url: string
}

export default function ProfileSetup() {
  const { user, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    school_id: "",
    first_name: "",
    last_name: "",
    email: user?.email || "",
    graduation_year: "",
    major: "",
    resume_text: ""
  })

  const fetchSchools = useCallback(async () => {
    try {
      console.log("Fetching schools from API...")
      const response = await fetch("http://localhost:8000/api/schools")
      console.log("Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Schools data:", data)
        setSchools(data.schools || [])
      } else {
        console.error("Failed to fetch schools:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching schools:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const checkExistingProfile = useCallback(async () => {
    if (!user?.id) return
    try {
      const response = await fetch(`http://localhost:8000/api/users/${user.id}/profile`)
      if (response.ok) {
        const data = await response.json()
        if (data.profile && data.profile.profile_completed) {
          console.log("Profile already complete, redirecting to dashboard")
          router.push("/dashboard")
        }
      } else if (response.status === 404) {
        console.log("No existing profile found")
      }
    } catch (error) {
      console.error("Error checking profile:", error)
    }
  }, [user?.id, router])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user?.id) {
      fetchSchools()
      checkExistingProfile()
    }
  }, [user?.id, fetchSchools, checkExistingProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`http://localhost:8000/api/users/${user?.id}/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          email: user?.email, // Use authenticated user's email
          graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null
        }),
      })

      if (response.ok) {
        console.log("Profile created successfully")
        await refreshProfile() // Refresh profile status

        // Add a small delay to ensure the profile is updated
        setTimeout(() => {
          router.push("/dashboard")
        }, 500)
      } else {
        const errorData = await response.json()
        console.error("Error creating profile:", errorData)
      }
    } catch (error) {
      console.error("Error submitting profile:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }


  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#fff5e9] flex items-center justify-center">
        <div className="text-[#4a3728]">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const selectedSchool = schools.find(school => school.id === formData.school_id)

  return (
    <div className="min-h-screen bg-[#fff5e9]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#e6d5c3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-3">
              <Image src="/images/goose-logo.png" alt="CoffeeChat Logo" width={40} height={40} />
              <span className="text-xl font-light text-[#4a3728]">CoffeeChat</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <GraduationCap className="h-16 w-16 text-[#4a3728] mx-auto mb-4" />
          <h1 className="text-3xl font-light text-[#4a3728] mb-2">
            Complete Your Profile
          </h1>
          <p className="text-[#8b7355] font-light">
            Tell us about yourself to get started with CoffeeChat
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3]">
          <CardHeader>
            <CardTitle className="text-xl font-light text-[#4a3728] flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* School Selection */}
              <div className="space-y-2">
                <Label htmlFor="school" className="text-[#4a3728] font-medium">
                  School *
                </Label>
                <select
                  id="school"
                  value={formData.school_id}
                  onChange={(e) => handleInputChange("school_id", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[#e6d5c3] bg-background px-3 py-2 text-sm ring-offset-background focus:border-[#4a3728] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select your school...</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} - {school.location}
                    </option>
                  ))}
                </select>
                {selectedSchool && (
                  <div className="flex items-center space-x-2 mt-2 p-2 bg-[#f5ebe1] rounded-lg">
                    {selectedSchool.logo_url && (
                      <Image
                        src={selectedSchool.logo_url}
                        alt={selectedSchool.name}
                        width={24}
                        height={24}
                        className="rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <span className="text-sm text-[#4a3728]">{selectedSchool.name}</span>
                    <span className="text-xs text-[#8b7355]">• {selectedSchool.location}</span>
                  </div>
                )}
                {schools.length === 0 && !isLoading && (
                  <div className="text-sm text-[#8b7355]">
                    No schools available. Please check your connection.
                  </div>
                )}
                {isLoading && (
                  <div className="text-sm text-[#8b7355]">
                    Loading schools...
                  </div>
                )}
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-[#4a3728] font-medium">
                    First Name *
                  </Label>
                  <Input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                    className="border-[#e6d5c3] focus:border-[#4a3728]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-[#4a3728] font-medium">
                    Last Name *
                  </Label>
                  <Input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange("last_name", e.target.value)}
                    className="border-[#e6d5c3] focus:border-[#4a3728]"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#4a3728] font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || formData.email}
                  className="border-[#e6d5c3] bg-gray-50 text-gray-600 cursor-not-allowed"
                  readOnly
                  disabled
                />
                <p className="text-xs text-[#8b7355]">
                  This is your authenticated Google email and cannot be changed.
                </p>
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="graduation_year" className="text-[#4a3728] font-medium">
                    Graduation Year
                  </Label>
                  <Input
                    id="graduation_year"
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.graduation_year}
                    onChange={(e) => handleInputChange("graduation_year", e.target.value)}
                    className="border-[#e6d5c3] focus:border-[#4a3728]"
                    placeholder="e.g. 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major" className="text-[#4a3728] font-medium">
                    Major/Field of Study
                  </Label>
                  <Input
                    id="major"
                    type="text"
                    value={formData.major}
                    onChange={(e) => handleInputChange("major", e.target.value)}
                    className="border-[#e6d5c3] focus:border-[#4a3728]"
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              {/* Resume Text */}
              <div className="space-y-2">
                <Label htmlFor="resume_text" className="text-[#4a3728] font-medium">
                  Resume Content (Optional)
                </Label>
                <Textarea
                  id="resume_text"
                  value={formData.resume_text}
                  onChange={(e) => handleInputChange("resume_text", e.target.value)}
                  className="border-[#e6d5c3] focus:border-[#4a3728] min-h-32"
                  placeholder="Paste your resume content here..."
                />
                <p className="text-xs text-[#8b7355]">
                  You can paste your resume content here for Goose to reference when helping with applications.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !formData.school_id || !formData.first_name || !formData.last_name}
                className="w-full bg-[#4a3728] hover:bg-[#3a2a1f] text-white font-light"
              >
                {isSubmitting ? "Setting up your profile..." : "Complete Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}