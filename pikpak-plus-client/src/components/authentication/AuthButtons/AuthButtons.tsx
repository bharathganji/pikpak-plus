import { IonButton, IonIcon } from '@ionic/react'
import GitHubButton from 'react-github-btn'
import './AuthButtons.css'
import { openOutline } from 'ionicons/icons'
function AuthButtons() {
  return (
    <>
      <div className="auth-button-container">
        <GitHubButton
          href="https://github.com/bharathganji/pikpak-plus"
          data-color-scheme="no-preference: light; light: light; dark: dark;"
          data-size="large"
          data-show-count="true"
          aria-label="Star bharathganji/pikpak-plus on GitHub"
        >
          Star
        </GitHubButton>
        <IonButton routerLink="/donate" fill="clear">
          Contribute &nbsp;<IonIcon icon={openOutline} />
        </IonButton>
      </div>
    </>
  )
}

export default AuthButtons
