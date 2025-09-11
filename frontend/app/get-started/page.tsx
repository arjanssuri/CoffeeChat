"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"

export default function GetStartedPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleEmailSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!")
      return
    }
    if (!formData.agreeToTerms) {
      alert("Please agree to the terms and conditions")
      return
    }
    // Mock sign up
    console.log("Mock sign up with:", formData)
    alert("Mock account created successfully!")
  }

  const handleGoogleSignUp = () => {
    // Mock Google sign up
    console.log("Mock Google sign up")
    alert("Mock Google account created successfully!")
  }

  return (
    <div className="min-h-screen bg-[#fff5e9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image src="/images/goose-logo.png" alt="CoffeeChat Logo" width={80} height={80} className="mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-light text-[#4a3728] mb-2">Join CoffeeChat</h1>
          <p className="text-[#8b7355] font-light">Start your journey to top clubs at UT Austin</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-[#e6d5c3] rounded-2xl shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-light text-[#4a3728]">Create Account</CardTitle>
            <CardDescription className="text-[#8b7355] font-light">Get started in less than 2 minutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Sign Up */}
            <Button
              onClick={handleGoogleSignUp}
              variant="outline"
              className="w-full rounded-xl border-[#e6d5c3] hover:bg-[#f5ebe1] text-[#4a3728] font-light py-6 bg-transparent"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <Separator className="bg-[#e6d5c3]" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-[#8b7355] font-light">
                or
              </span>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  className="rounded-xl border-[#e6d5c3] focus:border-[#d4a574] font-light"
                  required
                />
                <Input
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  className="rounded-xl border-[#e6d5c3] focus:border-[#d4a574] font-light"
                  required
                />
              </div>
              <Input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="rounded-xl border-[#e6d5c3] focus:border-[#d4a574] font-light"
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="rounded-xl border-[#e6d5c3] focus:border-[#d4a574] font-light"
                required
              />
              <Input
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className="rounded-xl border-[#e6d5c3] focus:border-[#d4a574] font-light"
                required
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                  className="border-[#e6d5c3] data-[state=checked]:bg-[#4a3728]"
                />
                <label htmlFor="terms" className="text-sm text-[#8b7355] font-light">
                  I agree to the{" "}
                  <Link href="#" className="text-[#4a3728] hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="text-[#4a3728] hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#4a3728] hover:bg-[#3d2e21] text-white rounded-xl font-light py-6"
              >
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-[#8b7355] font-light">
            Already have an account?{" "}
            <Link href="/signin" className="text-[#4a3728] hover:underline font-normal">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
