
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send, Plus } from 'lucide-react'
import { format } from 'date-fns'

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: string
}

interface Chat {
  id: string
  title: string
  createdAt: string
  lastMessage: string
  messages: Message[]
}

const fetchChats = async (): Promise<Chat[]> => {
  const response = await fetch('http://localhost:3000/chats')
  if (!response.ok) {
    throw new Error('Failed to fetch chats')
  }
  return response.json()
}

const createChat = async (title: string): Promise<Chat> => {
  const newChat = {
    title,
    createdAt: new Date().toISOString(),
    lastMessage: '',
    messages: []
  }
  
  const response = await fetch('http://localhost:3000/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newChat)
  })
  
  if (!response.ok) {
    throw new Error('Failed to create chat')
  }
  return response.json()
}

const sendMessage = async ({ chatId, content }: { chatId: string, content: string }) => {
  // First, get the current chat
  const chatResponse = await fetch(`http://localhost:3000/chats/${chatId}`)
  const chat = await chatResponse.json()
  
  // Add user message
  const userMessage: Message = {
    id: Date.now().toString(),
    content,
    sender: 'user',
    timestamp: new Date().toISOString()
  }
  
  // Simulate AI response
  const aiMessage: Message = {
    id: (Date.now() + 1).toString(),
    content: `I understand your question: "${content}". Based on the available technical documentation, I can help you analyze the data. Please let me know if you need specific information about any equipment or process parameters.`,
    sender: 'assistant',
    timestamp: new Date().toISOString()
  }
  
  const updatedMessages = [...chat.messages, userMessage, aiMessage]
  
  // Update chat with new messages
  const response = await fetch(`http://localhost:3000/chats/${chatId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...chat,
      messages: updatedMessages,
      lastMessage: content
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to send message')
  }
  return response.json()
}

const Chat = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [newChatTitle, setNewChatTitle] = useState('')
  const [showNewChatInput, setShowNewChatInput] = useState(false)
  
  const queryClient = useQueryClient()
  
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats
  })
  
  const createChatMutation = useMutation({
    mutationFn: createChat,
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      setSelectedChatId(newChat.id)
      setNewChatTitle('')
      setShowNewChatInput(false)
    }
  })
  
  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      setNewMessage('')
    }
  })
  
  const selectedChat = chats.find(chat => chat.id === selectedChatId)
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChatId) return
    
    sendMessageMutation.mutate({
      chatId: selectedChatId,
      content: newMessage
    })
  }
  
  const handleCreateChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChatTitle.trim()) return
    
    createChatMutation.mutate(newChatTitle)
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading chats...</div>
      </div>
    )
  }
  
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r bg-muted/10">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chats</h2>
            <Button
              size="sm"
              onClick={() => setShowNewChatInput(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {showNewChatInput && (
            <form onSubmit={handleCreateChat} className="mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Chat title..."
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" size="sm">
                  Create
                </Button>
              </div>
            </form>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className={`mb-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedChatId === chat.id ? 'bg-muted' : ''
                }`}
                onClick={() => setSelectedChatId(chat.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{chat.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(chat.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background">
              <h1 className="text-xl font-semibold">{selectedChat.title}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedChat.messages.length} messages
              </p>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedChat.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'user'
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>
                        {format(new Date(message.timestamp), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Message Input */}
            <div className="p-4 border-t bg-background">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No chat selected</h3>
              <p className="text-muted-foreground">
                Select a chat from the sidebar or create a new one to start messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat
