export function isURL(value: unknown) {
  if (typeof value === 'string') {
    let url: any
    try {
      url = new URL(value)
      return true
    } catch (error) {}
  }
  return false
}
