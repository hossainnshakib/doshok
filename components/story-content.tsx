"use client"

interface StoryContentProps {
  html: string
  className?: string
}

export default function StoryContent({ html, className }: StoryContentProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
