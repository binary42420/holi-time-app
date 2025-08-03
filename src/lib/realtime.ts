import Pusher from 'pusher-js'

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || 'YOUR_PUSHER_KEY'
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

export const pusherClient = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER,
  forceTLS: true
})

export function subscribeToTimesheetUpdates(timesheetId: string, callback: (data: any) => void) {
  const channel = pusherClient.subscribe(`timesheet-${timesheetId}`)
  channel.bind('status-update', callback)
  
  return () => {
    channel.unbind('status-update', callback)
    pusherClient.unsubscribe(`timesheet-${timesheetId}`)
  }
}
