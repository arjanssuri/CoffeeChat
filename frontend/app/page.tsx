"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Coffee, Users, Zap } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef } from "react"

export default function LandingPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const scrollWidth = scrollContainer.scrollWidth
    const clientWidth = scrollContainer.clientWidth
    let scrollPosition = 0

    const autoScroll = () => {
      scrollPosition += 1
      if (scrollPosition >= scrollWidth - clientWidth) {
        scrollPosition = 0
      }
      scrollContainer.scrollLeft = scrollPosition
    }

    const interval = setInterval(autoScroll, 30)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/goose-logo.png"
              alt="CoffeeChat Goose Logo"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-secondary">CoffeeChat</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/signin">
              <Button variant="outline" className="rounded-full bg-transparent">
                Sign In
              </Button>
            </Link>
            <Link href="/get-started">
              <Button className="rounded-full">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <Image
              src="/images/goose-logo.png"
              alt="CoffeeChat Goose Mascot"
              width={120}
              height={120}
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-light text-secondary mb-6 text-balance">Break into top Clubs</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            Navigate club applications, track info sessions, and schedule coffee chats with ease. CoffeeChat helps
            Longhorns connect with the organizations that matter most.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/get-started">
              <Button size="lg" className="rounded-full text-lg px-8 py-6">
                Start Your Journey
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16">
        <div className="container mx-auto px-4 text-center mb-12">
          <h2 className="text-4xl font-light text-secondary mb-4">Everything You Need to Succeed</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From application tracking to event management, CoffeeChat streamlines your club journey at UT Austin.
          </p>
        </div>

        <div
          className="overflow-x-auto scrollbar-hide"
          ref={scrollContainerRef}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="flex gap-6 min-w-max px-4">
            <Card className="rounded-2xl border-2 hover:shadow-lg transition-shadow flex-shrink-0 w-80">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-2">AI-Powered Matching</h3>
                <p className="text-muted-foreground">
                  Get personalized club recommendations based on your interests and goals.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-2 hover:shadow-lg transition-shadow flex-shrink-0 w-80">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-2">Event Tracking</h3>
                <p className="text-muted-foreground">
                  Never miss an info session, meeting, or deadline with smart notifications.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-2 hover:shadow-lg transition-shadow flex-shrink-0 w-80">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coffee className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-2">Coffee Chat Scheduler</h3>
                <p className="text-muted-foreground">
                  Easily schedule and manage one-on-one meetings with club members.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-2 hover:shadow-lg transition-shadow flex-shrink-0 w-80">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-2">Application Manager</h3>
                <p className="text-muted-foreground">
                  Track your applications, deadlines, and requirements all in one place.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
