import PocketBase from 'pocketbase'

export const pb = new PocketBase('https://aulaplay.duckdns.org')
// Disable auto-cancel so parallel requests don't cancel each other
pb.autoCancellation(false)
