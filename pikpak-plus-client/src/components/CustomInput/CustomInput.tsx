import { IonInput, IonButton, IonIcon } from '@ionic/react'
import './CustomInput.css'

export default function CustomInput({
  text,
  handleTextChange,
  handleSubmit,
  icon,
  customPlaceholder,
}: any) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLIonInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit(text)
    }
  }
  return (
    <div className="container">
      <div className="centered-element">
        <IonInput
          type="text"
          // fill="outline"
          placeholder={customPlaceholder}
          value={text}
          onIonInput={(e) => handleTextChange(e.detail.value!)}
          style={{ background: '#e0e0e0' }}
          onKeyDown={handleKeyDown}
        />

        <IonButton
          onClick={() => handleSubmit(text)}
          style={{ minHeight: '44px', margin: 0 }}
        >
          <IonIcon icon={icon}></IonIcon>
        </IonButton>
      </div>
    </div>
  )
}
