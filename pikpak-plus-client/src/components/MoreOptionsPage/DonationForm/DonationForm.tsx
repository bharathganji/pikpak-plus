import { useState } from 'react'
import {
  IonCard,
  IonCardContent,
  IonInput,
  IonButton,
  IonText,
  IonCheckbox,
} from '@ionic/react'
import './DonationForm.css' // Import CSS file for styling
import { getEmailandDirectory, makeRequest } from '../../../helpers/helpers'
import CommonToast from '../../commonToast/commonToast'
import BlockUiLoader from '../../BlockUiLoader/BlockUiLoader'

function DonationForm() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    expiry: '',
    contactInfo: '',
  })

  const [expiryError, setExpiryError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [agreeChecked, setAgreeChecked] = useState(false); 
  
  const email = getEmailandDirectory().email

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Validate email
    if (name === 'username') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        setEmailError('Invalid email format')
      } else {
        setEmailError('')
      }
    }

    // Validate password
    if (name === 'password') {
      if (value.length < 4) {
        setPasswordError('Password must be at least 4 characters long')
      } else {
        setPasswordError('')
      }
    }

    // Validate expiry (assuming positive numbers only)
    if (name === 'expiry') {
      if (parseInt(value) < 0) {
        setExpiryError('Expiry must be a positive number')
      } else {
        setExpiryError('')
      }
    }
  }

  const handleAgreeChange = (e) => {
    // Update state when user checks/unchecks the agreement checkbox
    setAgreeChecked(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    // Handle form submission here
    console.log(formData)

    // Check if contact-email is empty, if so, set it to pikpak-plus-email
    if (!formData['contactInfo']) {
      console.log('contact-email is empty. Setting it to pikpak-plus-email.')
      setFormData({
        ...formData,
        contactInfo: email as any,
      })
    }
    // Handle form submission here
    console.log(formData)
    try {
      const response = await makeRequest('insert_premium_account', 'POST', {
        ...formData,
        email: email,
      })
      if (response.status === 200) {
        setShowToast(true)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <BlockUiLoader loading={isLoading}>
      <div className="form-container">
        <IonCard className="account-card">
          <IonCardContent>
            <form onSubmit={handleSubmit} className="donation-form">
              <h2>
                <IonText color="dark">
                  Contribute Your Pikpak Account{' '}
                  <IonText color={'danger'}>{'[Premium]'}</IonText>
                </IonText>
              </h2>
              <div>
                <IonInput
                  type="email"
                  name="username"
                  placeholder="Pikpak Email"
                  value={formData.username}
                  onIonChange={handleChange}
                  fill="outline"
                  required
                />
                <IonText color="danger">{emailError}</IonText>
              </div>
              <div>
                <IonInput
                  type="password"
                  name="password"
                  autocomplete="off"
                  placeholder="Pikpak Password"
                  value={formData.password}
                  onIonChange={handleChange}
                  fill="outline"
                  required
                />
                <IonText color="danger">{passwordError}</IonText>
              </div>
              <div>
                <IonInput
                  type="number"
                  name="expiry"
                  placeholder="Premium Expiry (in days) eg:100"
                  value={formData.expiry}
                  fill="outline"
                  onIonChange={handleChange}
                />
                <IonText color="danger">{expiryError}</IonText>
              </div>
              <div>
                <IonInput
                  type="text"
                  name="contactInfo"
                  placeholder="Contact Information"
                  value={formData.contactInfo}
                  fill="outline"
                  onIonChange={handleChange}
                />
              </div>
              <div className="agreement-checkbox">
                <IonCheckbox
                  checked={agreeChecked}
                  onIonChange={handleAgreeChange}
                  slot="start"
                />
                <IonText>I agree to take all risks myself.</IonText>
              </div>
              <IonButton
                expand="block"
                type="submit"
                disabled={
                  !!expiryError ||
                  !!emailError ||
                  !!passwordError ||
                  !agreeChecked 
                }
              >
                Submit
              </IonButton>
            </form>
          </IonCardContent>
        </IonCard>
        <CommonToast
          message="Donation successful"
          color="success"
          duration={1000}
          showToast={showToast}
          setShowToast={setShowToast}
        />
      </div>
    </BlockUiLoader>
  )
}

export default DonationForm
