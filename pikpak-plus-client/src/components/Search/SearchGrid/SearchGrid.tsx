import React, { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { ColDef, GridOptions } from 'ag-grid-community'
import { IonButton, IonIcon } from '@ionic/react'
import { copy, open, shareSocial } from 'ionicons/icons'
import {
  getItemFromLocalStorage,
  makeRequest,
  prepareColumnDefs,
  prepareRowData,
} from '../../../helpers/helpers'
import './SearchGrid.css'
import CommonToast from '../../commonToast/commonToast'
import { TorrentInfo } from '../../../types/sharedTypes'

export interface AgGridProps {
  searchInfoList: TorrentInfo[] | null
}

const SearchGrid: React.FC<AgGridProps> = ({ searchInfoList }) => {
  const columnDefs: ColDef[] = useMemo(() => prepareColumnDefs(), [])

  const rowData: TorrentInfo[] = useMemo(
    () => prepareRowData(searchInfoList ? searchInfoList : []),
    [searchInfoList],
  )

  const gridOptions: GridOptions = {
    pagination: true,
    paginationPageSize: 20,
    rowHeight: 45,
    autoSizeStrategy: {
      type: 'fitCellContents',
    },
  }
  const shareColumn: ColDef = {
    headerName: 'Share URL',
    field: 'Details',
    cellRenderer: 'shareCellRenderer',
    width: 100,
    resizable: false,
  }

  const copyColumn: ColDef = {
    headerName: 'Copy Magnet',
    field: 'Link',
    cellRenderer: 'copyCellRenderer',
    width: 120,
    resizable: false,
  }

  const openUrlColumn: ColDef = {
    headerName: 'Open URL',
    field: 'Details',
    cellRenderer: 'openUrlCellRenderer',
    width: 100,
    resizable: false,
  }

  const components = {
    copyCellRenderer: CopyCellRenderer,
    openUrlCellRenderer: OpenUrlCellRenderer,
    shareCellRenderer: ShareCellRenderer,

    // ... (add other cell renderers for future columns)
  }
  const darkMode = getItemFromLocalStorage('darkMode')

  return (
    <div
      className={`${
        darkMode === 'true' ? 'ag-theme-quartz-auto-dark' : 'ag-theme-alpine'
      } grid-container`}
    >
      <AgGridReact
        columnDefs={[...columnDefs, copyColumn, openUrlColumn, shareColumn]}
        rowData={rowData}
        gridOptions={gridOptions}
        components={components}
      />
    </div>
  )
}
const CopyCellRenderer: React.FC<{ value: any }> = ({ value }) => {
  const [showCopyToast, setShowCopyToast] = useState(false)

  const handleCopy = async () => {
    try {
      const copyText = value.includes('magnet')
        ? value
        : (await makeRequest('/getRedirectUrl', 'POST', { url: value })).data
      await navigator.clipboard.writeText(copyText)
      setShowCopyToast(true)
    } catch (error) {
      alert('Failed to copy to clipboard:' + error)
      // Handle error if needed
    }
  }

  return (
    <>
      <IonButton
        color="success"
        onClick={handleCopy}
        size="small"
        className="ion-no-padding ion-no-margin"
      >
        <IonIcon icon={copy} />
      </IonButton>
      <CommonToast
        message="Copied to clipboard"
        color="success"
        duration={1000}
        showToast={showCopyToast}
        setShowToast={setShowCopyToast}
      />
    </>
  )
}

const OpenUrlCellRenderer: React.FC<{ value: any }> = ({ value }) => {
  const [showOpenUrlToast, setShowOpenUrlToast] = useState(false)

  const handleOpenUrl = () => {
    // Logic to open URL in a new tab
    const newTab = window.open(value, '_blank')
    if (newTab) {
      newTab.focus()
    }

    // Show toast
    setShowOpenUrlToast(true)
  }

  return (
    <>
      <IonButton
        color="warning"
        onClick={handleOpenUrl}
        size="small"
        className="ion-no-padding ion-no-margin"
      >
        <IonIcon icon={open} />
      </IonButton>
      <CommonToast
        message="Opened URL in a new tab"
        color="success"
        duration={1000}
        showToast={showOpenUrlToast}
        setShowToast={setShowOpenUrlToast}
      />
    </>
  )
}
const ShareCellRenderer: React.FC<{ value: any }> = ({ value }) => {
  const [showShareToast, setShowShareToast] = useState(false)

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({ text: value })
        .then(() => {
          setShowShareToast(true)
        })
        .catch((error) => {
          console.error('Failed to share:', error)
        })
    } else {
      console.log('Share API is not supported in this browser')
    }
  }

  return (
    <>
      <IonButton
        color="primary" // Choose the appropriate color for the Share button
        onClick={handleShare}
        size="small"
        className="ion-no-padding ion-no-margin"
      >
        <IonIcon icon={shareSocial} />
      </IonButton>
      <CommonToast
        message="Shared successfully"
        color="primary" // Choose the appropriate color for the toast
        duration={1000}
        showToast={showShareToast}
        setShowToast={setShowShareToast}
      />
    </>
  )
}

export default SearchGrid
