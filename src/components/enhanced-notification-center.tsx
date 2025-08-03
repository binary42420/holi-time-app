'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRealtime } from '@/lib/realtime'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

// Add React JSX types
declare module 'react' {
  interface JSX {
    IntrinsicElements: {
      [elemName: string]: any;
    }
  }
}

type NotificationType = 'success' | 'error' | 'warning' | 'info'
type NotificationPriority = 'low' | 'medium' | 'high'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  category?: string
  priority?: NotificationPriority
  sound?: boolean
}

interface NotificationEventData {
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  actionUrl?: string
  sound?: boolean
}

// Sound effects for notifications - initialized lazily for SSR compatibility
const notificationSounds = {
  success: typeof window !== 'undefined' ? new Audio('/sounds/success.mp3') : null,
  error: typeof window !== 'undefined' ? new Audio('/sounds/error.mp3') : null,
  warning: typeof window !== 'undefined' ? new Audio('/sounds/warning.mp3') : null,
  info: typeof window !== 'undefined' ? new Audio('/sounds/info.mp3') : null,
}

// CSS animations in globals.css:
// @keyframes wiggle {
//   0%, 100% { transform: rotate(0deg); }
//   25% { transform: rotate(-10deg); }
//   75% { transform: rotate(10deg); }
// }
// @keyframes pulse-ring {
//   0% { transform: scale(0.8); opacity: 0.5; }
//   100% { transform: scale(1.2); opacity: 0; }
// }

// Custom hook for realtime notifications
function useRealtimeNotifications(initialNotifications: Notification[] = []) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const { subscribe, isConnected } = useRealtime()
  const { toast } = useToast()

  const playNotificationSound = useCallback((type: NotificationType) => {
    try {
      if (typeof window !== 'undefined') {
        const sound = notificationSounds[type]
        if (sound) {
          sound.currentTime = 0
          sound.play().catch(() => {
            // Ignore autoplay errors
            console.debug('Notification sound blocked by browser')
          })
        }
      }
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }, [])

  const handleNotification = useCallback((data: NotificationEventData, category?: string) => {
    const notification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type: data.type || 'info',
      title: data.title,
      message: data.message,
      timestamp: new Date(),
      read: false,
      category,
      priority: data.priority || 'medium',
      actionUrl: data.actionUrl,
      sound: data.sound
    }
    
    setNotifications((prev: Notification[]) => [notification, ...prev])
    
    // Play sound for high priority or explicitly requested sound
    if (notification.priority === 'high' || notification.sound) {
      playNotificationSound(notification.type)
    }
    
    // Show toast for high priority notifications
    if (notification.priority === 'high') {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      })
    }
  }, [toast, playNotificationSound])

  useEffect(() => {
    const unsubscribeShift = subscribe('shift_notification', 
      (data: NotificationEventData) => handleNotification(data, 'shift')
    )

    const unsubscribeTimesheet = subscribe('timesheet_notification', 
      (data: NotificationEventData) => handleNotification(data, 'timesheet')
    )

    // Subscribe to connection status changes
    const unsubscribeConnection = subscribe('connection_status', 
      (data: { status: 'connected' | 'disconnected' }) => {
        if (data.status === 'connected') {
          toast({
            title: 'Connected',
            description: 'Real-time connection established',
            variant: 'default',
          })
        } else {
          toast({
            title: 'Disconnected',
            description: 'Lost connection to server. Attempting to reconnect...',
            variant: 'destructive',
          })
        }
      }
    )

    return () => {
      unsubscribeShift()
      unsubscribeTimesheet()
      unsubscribeConnection()
    }
  }, [subscribe, handleNotification, toast])

  return {
    notifications,
    setNotifications,
    isConnected
  }
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-600" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case 'info':
      return <Info className="h-4 w-4 text-blue-600" />
  }
}

const getNotificationBadgeColor = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800'
    case 'info':
      return 'bg-blue-100 text-blue-800'
  }
}

export default function EnhancedNotificationCenter() {
  const { notifications, setNotifications, isConnected } = useRealtimeNotifications([])
  const [isOpen, setIsOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative hover:bg-muted/50 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {!isConnected && (
            <WifiOff className="h-3 w-3 text-destructive absolute -top-1 -right-1" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-in zoom-in-50 duration-300"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Notifications</CardTitle>
                {!isConnected && (
                  <Badge variant="outline" className="text-destructive border-destructive">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs hover:bg-muted/50"
                >
                  Mark all read
                </Button>
              )}
            </div>
            {unreadCount > 0 && (
              <CardDescription>
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-muted/20' : ''
                      }`}
                      onClick={() => {
                        markAsRead(notification.id)
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getNotificationBadgeColor(notification.type)}`}
                              >
                                {notification.type}
                              </Badge>
                              {notification.category && (
                                <Badge variant="outline" className="text-xs">
                                  {notification.category}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(notification.timestamp, 'MMM d, HH:mm')}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(notification.id)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
