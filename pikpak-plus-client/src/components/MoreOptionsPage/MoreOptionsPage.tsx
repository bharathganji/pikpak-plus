import {
  IonButton,
  IonChip,
  IonContent,
  IonIcon,
  IonItemDivider,
  IonText,
} from '@ionic/react'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import HelperCard from '../HelperCard/HelperCard'

import { serverOutline } from 'ionicons/icons'
import './MoreOptionsPage.css'
import { useEffect, useState } from 'react'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'
import {
  bytesToTiB,
  getServerExpireDate,
  makeRequest,
} from '../../helpers/helpers'
import DonationForm from './DonationForm/DonationForm'

function MoreOptionsPage() {
  const [serverOptions, setServerOptions] = useState({})
  const [selectedServer, setSelectedServer] = useState<string>(
    localStorage.getItem('selectedServer') || '',
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Load server options from local storage on component mount
  useEffect(() => {
    const storedServerOptions = localStorage.getItem('serverOptions')
    if (storedServerOptions) {
      setServerOptions(JSON.parse(storedServerOptions))
      //   setSelectedServer(localStorage.getItem('selectedServer') || '')
    } else {
      fetchServers() // Fetch server options from the API if not found in local storage
    }
  }, [])

  useEffect(() => {}, [selectedServer])

  // Save selected server to local storage when changed
  useEffect(() => {
    localStorage.setItem('selectedServer', selectedServer)
  }, [selectedServer])

  const fetchServers = async () => {
    try {
      setIsLoading(true)
      const response = await makeRequest('getServers', 'GET', {})
      const data = response.data
      setServerOptions(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const serverContentPreparation = (index: any) => {
    return (
      <>
        <IonText color={'black'}>
          Drive:
          {bytesToTiB(serverOptions[index].drive_used || 0) +
            ' / ' +
            bytesToTiB(serverOptions[index].limit)}
        </IonText>{' '}
        <IonText color={'black'}>Expiry: {getServerExpireDate(index)}</IonText>
      </>
    )
  }

  const handleConnectClick = (index: any) => {
    setSelectedServer(index)
  }

  return (
    <>
      <CustomIonHeader title="Settings" />

      <BlockUiLoader loading={isLoading}>
        <IonContent fullscreen={true}>
          <h2 color="primary" className="title-server">
            <IonText color={'primary'}>Select #Server</IonText>
          </h2>
          <div className="card-divider">
            {serverOptions &&
              Object.keys(serverOptions).map((index) => (
                <HelperCard
                  key={index}
                  cardTitle={'Premium #' + serverOptions[index].server_id}
                  cardSubtitle={serverContentPreparation(index)}
                  cardSubTitleStyle={{
                    display: 'flex',
                    flexDirection: 'column',
                    textAlign: 'justify',
                  }}
                  cardContent={
                    <>
                      <IonButton
                        slot="end"
                        onClick={() => handleConnectClick(index)}
                        fill={selectedServer === index ? 'clear' : 'solid'}
                        className="ion-button-server"
                      >
                        {selectedServer === index ? 'Connected' : 'Connect'}
                      </IonButton>
                    </>
                  }
                  icon={serverOutline}
                  titleColor="tertiary"
                />
              ))}
          </div>
          <div className="server-contact">
            {serverOptions[selectedServer] &&
              serverOptions[selectedServer].contact && (
                <>
                  <IonChip color="tertiary" className="ion-chip-server" outline>
                    #{selectedServer} &nbsp; <IonIcon icon={serverOutline} />
                    <IonText>
                      Support/Queries <br /> contact:{' '}
                      {serverOptions[selectedServer].contact}
                    </IonText>
                  </IonChip>
                </>
              )}
          </div>
          <IonItemDivider className="ion-item-divider" />
          <DonationForm />
        </IonContent>
      </BlockUiLoader>
    </>
  )
}

export default MoreOptionsPage
