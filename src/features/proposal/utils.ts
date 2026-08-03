export function normalizeAddress(address: string) {
  return address.toLowerCase()
}

export function getCountdownParts(timestamp: number) {
  const diff = Math.max(timestamp * 1000 - Date.now(), 0)
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return { days, hours, minutes }
}
