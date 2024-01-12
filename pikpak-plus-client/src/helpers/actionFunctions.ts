export const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
    console.log('Value copied to clipboard:\n', value)
  } catch (error) {
    console.error('Error copying value to clipboard:\n', error)
  }
}
