// Search.tsx
import { useEffect, useState } from 'react'
import './Search.css'
import { IonChip, IonContent, IonIcon, IonText, IonToast } from '@ionic/react'
import SearchGrid from './SearchGrid/SearchGrid'
import { search, warningOutline } from 'ionicons/icons'
import CustomInput from '../CustomInput/CustomInput'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'
import { SearchFieldsResponse, TorrentInfo } from '../../types/sharedTypes'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import { makeRequest } from '../../helpers/helpers'
import CustomIonSelect from './CustomIonSelect/CustomIonSelect'

export default function Search() {
  const [searchInfoList, setSearchInfoList] = useState<
    TorrentInfo[] | null | any
  >(null)
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectLoading, setSelectLoading] = useState(false)

  const [searchFields, setSearchFields] = useState<SearchFieldsResponse[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTrackers, setSelectedTrackers] = useState<string[]>([])

  useEffect(() => {
    if (!sessionStorage.getItem('searchFields')) {
      fetchSearchFields()
        .then((data) => {
          if (data) {
            sessionStorage.setItem('searchFields', JSON.stringify(data))
            setSearchFields(data)
          }
        })
        .catch((error) => {
          setShowToast({
            message: 'Error fetching search fields: ' + error,
            color: 'danger',
          })
        })
    } else {
      sessionStorage.getItem('searchFields') &&
        setSearchFields(JSON.parse(sessionStorage.getItem('searchFields')!))
    }
  }, [])

  const fetchSearchFields = async () => {
    try {
      setSelectLoading(true)
      const response = await makeRequest('searchFields', 'GET', {})

      const formattedResponse = response.data.map((item: any) => {
        const { indexer, categories } = item
        const formattedCategories = categories.map((category: any) => ({
          code: category.code,
          value: category.value,
        }))

        return {
          indexer: {
            code: indexer.code,
            value: indexer.value,
          },
          categories: formattedCategories,
        }
      })

      if (formattedResponse) {
        setShowToast({
          message: 'categories and indexers fetched successfully.',
          color: 'success',
        })
        return formattedResponse
      }
    } catch (error) {
      console.error('Error fetching search fields:', error)
    } finally {
      setSelectLoading(false)
    }
  }

  const fetchData = async (searchTerm: string) => {
    try {
      const response = await makeRequest('search', 'POST', {
        query: searchTerm,
        categoryList: selectedCategories,
        indexerList: selectedTrackers,
      })

      const data: TorrentInfo[] | string = response.data
      if (data && data != 'No results found') {
        setShowToast({
          message: 'Data fetched successfully.',
          color: 'success',
        })

        setSearchInfoList(data)
      }
    } catch (error) {
      setShowToast({
        message: 'Try Different Categories or Indexers',
        color: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (text: string) => {
    const trimmedText = text.trim()
    if (!trimmedText) {
      setShowToast({ message: 'Please enter a valid text.', color: 'danger' })
      return
    }
    setLoading(true)
    fetchData(trimmedText)
  }

  const categoriesOptions = searchFields
    ?.filter((item) => selectedTrackers.includes(item.indexer.code)) // Filter based on selectedTrackers
    .map((item) => item.categories)
    .flat()
  const trackersOptions = searchFields?.map((item) => item.indexer).flat()

  return (
    <>
      <CustomIonHeader title="Search" />

      <IonContent fullscreen={true}>
        <div className="container select-container">
          <div className="centered-element select-container-inner">
            <BlockUiLoader loading={selectLoading}>
              <CustomIonSelect
                label="Trackers"
                placeholder="Trackers (Default: All)"
                options={trackersOptions}
                multiple={true}
                setSelected={setSelectedTrackers}
              />
            </BlockUiLoader>
            <CustomIonSelect
              label="Categories"
              placeholder="Categories (Default: All)"
              options={
                selectedTrackers.length > 1 ? [] : categoriesOptions || []
              }
              multiple={true}
              setSelected={setSelectedCategories}
              isDisabled={
                selectedTrackers.length > 1 || selectedTrackers.length === 0
              }
            />
          </div>
          {selectedTrackers.length > 1 && (
            <div className="seach-warning">
              <IonChip color={'warning'}>
                <IonIcon icon={warningOutline} color="danger" />
                <IonText color={'dark'}>
                  select single Tracker to enable Categories
                </IonText>
              </IonChip>
            </div>
          )}
        </div>
        <CustomInput
          handleSubmit={handleSubmit}
          customPlaceholder=" Search... eg: avengers"
          icon={search}
        />
        <div className="container">
          <BlockUiLoader loading={loading}>
            <SearchGrid searchInfoList={searchInfoList || []} />
          </BlockUiLoader>
        </div>
        <IonToast
          isOpen={!!showToast}
          onDidDismiss={() => setShowToast(null)}
          message={showToast?.message}
          duration={1000}
          color={showToast?.color}
        />
      </IonContent>
    </>
  )
}
