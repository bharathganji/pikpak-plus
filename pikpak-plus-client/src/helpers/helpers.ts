import { ColDef, SortDirection } from 'ag-grid-community'
import axios from 'axios'
import { TorrentInfo } from '../types/sharedTypes'
import { Clipboard } from '@capacitor/clipboard'

const convertToBytes = (value: string): number => {
  const numericValue = parseFloat(value)
  if (isNaN(numericValue)) {
    return numericValue
  }
  const unit = value.toLowerCase().replace(/[^a-z]/g, '')

  switch (unit) {
    case 'kb':
      return numericValue * 1024
    case 'mb':
      return numericValue * 1024 * 1024
    case 'gb':
      return numericValue * 1024 * 1024 * 1024
    case 'mib':
      return numericValue * 1024 * 1024
    case 'gib':
      return numericValue * 1024 * 1024 * 1024
    default:
      return numericValue
  }
}

const sizeComparator = (valueA: any, valueB: any): number => {
  const bytesA = convertToBytes(valueA)
  const bytesB = convertToBytes(valueB)

  return bytesA - bytesB
}

export const prepareColumnDefs = (): ColDef[] => {
  return [
    {
      headerName: 'Title',
      field: 'Title',
      filter: 'agTextColumnFilter',
      // width: 100,
      // resizable: false
    },
    {
      headerName: 'Size',
      field: 'Size',
      // width: 120,
      comparator: sizeComparator,
    },
    {
      headerName: 'Seedr',
      field: 'Seeders',
      width: 100,
      sort: 'desc' as SortDirection,
      resizable: false,
    },
    {
      headerName: 'Peers',
      field: 'Peers',
      width: 90,
      resizable: false,
    },
    { headerName: 'Tracker', field: 'Tracker', filter: true, width: 150 },
  ].map((data) => ({ ...data, suppressMovable: true }))
}

export const prepareRowData = (data: any): TorrentInfo[] => {
  const formattedData = data.map((item) => {
    return {
      ...item,
      Size: formatFileSize(item.Size),
    }
  })

  return formattedData
}

export function getauthCookie() {
  const authCookie = document.cookie
    .split(';')
    .find((cookie) => cookie.trim().startsWith('auth='))

  const authCookieValue = authCookie ? authCookie.split('=')[1] : undefined
  return authCookieValue
}
export const setCookie = (name, value, hours) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + hours * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

export const setEmailandDirectory = (email, directory) => {
  localStorage.setItem('email', email)
  localStorage.setItem('dir', directory)
}
export const getEmailandDirectory = () => {
  return {
    email: localStorage.getItem('email'),
    dir: localStorage.getItem('dir'),
  }
}
export const deleteEmailandDirectory = () => {
  localStorage.removeItem('email')
  localStorage.removeItem('dir')
}

export const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}
export const makeRequest = async (
  url: string,
  method: string,
  data: any = null,
) => {
  try {
    const auth = getauthCookie()

    // Set the Authorization header with the access token
    axios.defaults.headers.common['Authorization'] = `Bearer ${auth}`
    const baseUrl = import.meta.env.VITE_PIKPAK_PLUS_API
      ? import.meta.env.VITE_PIKPAK_PLUS_API
      : `/api`

    // Make the request
    const response = await axios({
      method,
      url: baseUrl + '/' + url,

      data,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return response
  } catch (error) {
    console.error('Error making request:', error)
    throw error // Rethrow the error for handling in the calling code
  }
}

export function isJWTValid(jwt) {
  if (!jwt) {
    return false
  }
  try {
    // Split the JWT into header, payload, and signature parts
    const [payloadEncoded] = jwt.split('.')

    // Decode the header and payload
    // const header = JSON.parse(atob(headerEncoded))
    const payload = JSON.parse(atob(payloadEncoded))

    // Check if the token has expired
    const currentTimestamp = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < currentTimestamp) {
      return false
    }

    return true
  } catch (error) {
    // Handle any errors that occur during decoding or checks
    console.error('Error checking JWT validity:', error)
    return false
  }
}

export function formatFileSize(sizeInBytes: number): string {
  const sizeInMB = sizeInBytes / (1024 * 1024)
  const sizeInGB = sizeInBytes / (1024 * 1024 * 1024)

  if (sizeInGB >= 1) {
    return `${sizeInGB.toFixed(1)} GB`
  } else {
    return `${sizeInMB.toFixed(1)} MB`
  }
}

export const formatCreationTime = (creationTime) => {
  if (!creationTime) return '' // handle the case when creationTime is undefined or null

  const formattedDate = new Date(creationTime).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'short',
  })

  return formattedDate
}

export function bytesToGB(bytes: number): number {
  const GB = bytes / (1024 * 1024 * 1024)
  return GB
}

export const writeToClipboard = async (value: string) => {
  await Clipboard.write({
    string: value,
  })
}
