// Search.tsx
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './Search.css'
import { IonContent, IonToast } from '@ionic/react'
import SearchGrid from './SearchGrid/SearchGrid'
import { WEBSITES } from '../../constants/constants'
import { search } from 'ionicons/icons'
import CustomInput from '../CustomInput/CustomInput'
import Checkbox from '../checkbox/Checkbox'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'
import { SearchInfo, YtsData } from '../../types/sharedTypes'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'

export default function Search() {
  const [searchInfoList, setSearchInfoList] = useState<
    SearchInfo[] | YtsData[] | null | any
  >(null)
  const [text, settext] = useState<string>('')
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  const fetchData = async (searchTerm: string) => {
    try {
      const response = await axios.get(`/api/all/${searchTerm}`)
      const data: SearchInfo[] = response.data

      console.log(data)
      data.forEach((item) => {
        if (item && item.error) {
          setShowToast({
            message: item.error,
            color: 'danger',
          })
        } else {
          setSearchInfoList(data)
        }
      })
    } catch (error) {
      setShowToast({
        message: 'An error occurred while fetching data. Please try again.',
        color: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTextChange = (value: string) => {
    settext(value!)
  }

  const handleSubmit = (text: string) => {
    const trimmedText = text.trim()
    settext(trimmedText)
    console.log('text: ', trimmedText)
    setLoading(true)
    if (!trimmedText || trimmedText === '') {
      setShowToast({
        message: 'Please enter a valid text.',
        color: 'danger',
      })
      return
    }
    fetchData(trimmedText)
    settext('')
  }

  const SearchGridMemoized = React.memo(SearchGrid)
  const CheckboxMemoized = React.memo(Checkbox)

  const [SelectedWebsite, setSelectedWebsite] = useState<string[]>([])

  return (
    <>
      <CustomIonHeader title="Search" />

      <IonContent fullscreen={true}>
        <CheckboxMemoized
          customData={WEBSITES}
          SelectedWebsite={SelectedWebsite}
          setSelectedWebsite={setSelectedWebsite}
        />
        <CustomInput
          text={text}
          handleTextChange={handleTextChange}
          handleSubmit={handleSubmit}
          customPlaceholder="   Search..."
          icon={search}
        />
        {/* Use the new SearchLoader component */}
        <BlockUiLoader loading={loading}>
          <SearchGridMemoized searchInfoList={searchInfoList} />
        </BlockUiLoader>
        <IonToast
          isOpen={!!showToast}
          onDidDismiss={() => setShowToast(null)}
          message={showToast?.message}
          duration={3000}
          color={showToast?.color}
        />
      </IonContent>
    </>
  )
}
