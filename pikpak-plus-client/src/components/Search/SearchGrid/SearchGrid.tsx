import React, { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { ColDef, GridOptions } from 'ag-grid-community'
import { IonButton, IonIcon } from '@ionic/react'
import { copy, open, shareSocial } from 'ionicons/icons'
import {
  GenericData,
  prepareColumnDefs,
  prepareRowData,
} from '../../../helpers/helpers'
import './SearchGrid.css'
import CommonToast from '../../commonToast/commonToast'

export interface AgGridProps {
  searchInfoList: GenericData[] | null
}

const AgGrid: React.FC<AgGridProps> = ({ searchInfoList }) => {
  const columnDefs: ColDef[] = useMemo(() => prepareColumnDefs(), [])
  const rowData: any[] = useMemo(
    () =>
      searchInfoList
        ? searchInfoList.flat().flatMap((item) => prepareRowData(item))
        : [],
    [searchInfoList],
  )

  const gridOptions: GridOptions = {
    pagination: true,
    paginationPageSize: 20,
    cacheBlockSize: 20,
    // height
    rowHeight: 45, // Set the desired row height here
  }
  const shareColumn: ColDef = {
    headerName: 'Share',
    field: 'Url', // Replace 'ShareField' with the actual field name from your data
    cellRenderer: 'shareCellRenderer',
    width: 100,
  }

  const copyColumn: ColDef = {
    headerName: 'Copy',
    field: 'MagnetOrTorrent',
    cellRenderer: 'copyCellRenderer',
    width: 100,
  }

  const openUrlColumn: ColDef = {
    headerName: 'Open URL',
    field: 'Url',
    cellRenderer: 'openUrlCellRenderer',
    width: 100,
  }

  const components = {
    copyCellRenderer: CopyCellRenderer,
    openUrlCellRenderer: OpenUrlCellRenderer,
    shareCellRenderer: ShareCellRenderer,

    // ... (add other cell renderers for future columns)
  }
  return (
    <div className="ag-theme-alpine grid-container">
      <AgGridReact
        columnDefs={[...columnDefs, copyColumn, openUrlColumn, shareColumn]}
        rowData={rowData?.flat()}
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
      await navigator.clipboard.writeText(value)
      console.log('Copied to clipboard:', value)
      setShowCopyToast(true)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Handle error if needed
    }
  }

  return (
    <>
      <IonButton
        color="warning"
        onClick={handleCopy}
        size="small"
        className="ion-no-padding ion-no-margin"
      >
        <IonIcon icon={copy} />
      </IonButton>
      <CommonToast
        message="Copied to clipboard"
        color="success"
        duration={2000}
        showToast={showCopyToast}
        setShowToast={setShowCopyToast}
      />
    </>
  )
}

const OpenUrlCellRenderer: React.FC<{ value: any }> = ({ value }) => {
  const [showOpenUrlToast, setShowOpenUrlToast] = useState(false)

  const handleOpenUrl = () => {
    console.log(value)

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
        color="success"
        onClick={handleOpenUrl}
        size="small"
        className="ion-no-padding ion-no-margin"
      >
        <IonIcon icon={open} />
      </IonButton>
      <CommonToast
        message="Opened URL in a new tab"
        color="success"
        duration={2000}
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
          console.log('Shared:', value)
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
        duration={2000}
        showToast={showShareToast}
        setShowToast={setShowShareToast}
      />
    </>
  )
}

export default AgGrid
