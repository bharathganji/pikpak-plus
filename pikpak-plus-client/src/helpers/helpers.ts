import { ColDef, SortDirection } from 'ag-grid-community'
import { YtsData, SearchInfo } from '../types/sharedTypes' // Update the path accordingly
import axios from 'axios'
import { CONSTANTS } from '../constants/constants'

export type GenericData = YtsData | SearchInfo

// Function to prepare column definitions dynamicallyimport { ColDef } from "ag-grid-community";
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
    default:
      return numericValue
  }
}

const sizeComparator = (valueA: any, valueB: any): number => {
  const bytesA = convertToBytes(valueA)
  const bytesB = convertToBytes(valueB)

  return bytesA - bytesB
}

const seedersComparator = (valueA: any, valueB: any): number => {
  const numericValueA = isNaN(valueA) ? -1 : parseFloat(valueA)
  const numericValueB = isNaN(valueB) ? -1 : parseFloat(valueB)

  // Handle cases where both values are numbers or neither are numbers
  if (!isNaN(numericValueA) && !isNaN(numericValueB)) {
    return numericValueA - numericValueB
  }

  // Handle cases where only one of the values is a number
  if (!isNaN(numericValueA)) {
    return -1 // Numeric values should come first
  }
  if (!isNaN(numericValueB)) {
    return 1 // Numeric values should come first
  }

  // Handle cases where both values are non-numeric
  // Use string comparison
  return String(valueA).localeCompare(String(valueB), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export const prepareColumnDefs = (): ColDef[] => {
  return [
    {
      headerName: 'Name',
      field: 'Name',
      filter: 'agTextColumnFilter',
      width: 325,
    },
    {
      headerName: 'Size',
      field: 'Size',
      filter: true,
      width: 120,
      comparator: sizeComparator,
      sort: 'desc' as SortDirection,
    },
    {
      headerName: 'Seeders',
      field: 'Seeders',
      filter: 'agNumberColumnFilter',
      width: 130,

      comparator: seedersComparator,
    },
    {
      headerName: 'Leechers',
      field: 'Leechers',
      filter: 'agNumberColumnFilter',
      width: 120,
    },
    {
      headerName: 'Magnet/Torrent',
      field: 'MagnetOrTorrent',
      filter: true,
    },
    { headerName: 'Type', field: 'Type', filter: true, width: 100 },
    { headerName: 'Url', field: 'Url', filter: true },
  ].map((data) => ({ ...data, suppressMovable: true }))
}

// Function to prepare row data dynamically// Function to prepare row data dynamically
export const prepareRowData = (data: GenericData): any[] => {
  const rows: any[] = []

  if (data.Files && data.Files.length) {
    data.Files.forEach((file) => {
      const fileRow: any = { ...data } // Copy parent data

      // Check for the presence of either 'Magnet' or 'Torrent' key in 'Files'
      const magnetOrTorrentKey = file.Magnet
        ? 'Magnet'
        : file.Torrent
        ? 'Torrent'
        : ''

      // Include 'Magnet' or 'Torrent' data in the row
      if (magnetOrTorrentKey) {
        fileRow.MagnetOrTorrent = file[magnetOrTorrentKey]
      }

      // Include 'Files' data in the row
      Object.entries(file).forEach(([fileKey, fileValue]) => {
        fileRow[fileKey] = fileValue
      })

      rows.push(fileRow)
    })
  } else {
    // Add a single row for all data
    // Check for the presence of either 'Magnet' or 'Torrent' key in the main data
    const magnetOrTorrentKey = data.Magnet
      ? 'Magnet'
      : data.Torrent
      ? 'Torrent'
      : ''

    // Include 'Magnet' or 'Torrent' data in the row
    if (magnetOrTorrentKey) {
      const singleRow: any = {
        ...data,
        MagnetOrTorrent: data[magnetOrTorrentKey],
      }
      rows.push(singleRow)
    } else {
      // Add a single row for all data
      const singleRow: any = { ...data }
      rows.push(singleRow)
    }
  }
  return rows
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

    // Make the request
    const response = await axios({
      method,
      url: `${CONSTANTS.api_url}/${url}`,

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
