"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

export default function AuthCallback() {
  const { user, loading, profileComplete } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // Wait for auth state to be determined
      if (loading) return

      if (!user) {
        // If no user, redirect to sign in
        router.push("/signin")
        return
      }

      // Wait a moment for profile check to complete
      setTimeout(() => {
        if (profileComplete === false) {
          // New user or incomplete profile - redirect to setup
          router.push("/profile-setup")
        } else if (profileComplete === true) {
          // Existing user with complete profile - redirect to dashboard
          router.push("/dashboard")
        }
      }, 1000)
    }

    handleCallback()
  }, [user, loading, profileComplete, router])

  return (
    <div className="min-h-screen bg-[#fff5e9] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4a3728] mx-auto mb-4"></div>
        <p className="text-[#4a3728] font-light">Setting up your account...</p>
      </div>
    </div>
  )
}