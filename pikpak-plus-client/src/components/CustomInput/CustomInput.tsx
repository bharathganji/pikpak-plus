import { useRef } from 'react'
import { IonButton, IonIcon, IonTextarea } from '@ionic/react'
import './CustomInput.css'

export default function CustomInput({
  handleSubmit,
  icon,
  inputStyle,
  buttonText,
  customPlaceholder,
  onSubmitClearInput = false,
}: any) {
  const inputRef = useRef<HTMLIonTextareaElement>(null) // Adjust the ref type

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit(inputRef.current?.value)
        onSubmitClearInput &&  inputRef.current?.value ? (inputRef.current.value = '') : null
      }}
    >
      <div className="container ">
        <IonTextarea
          autoGrow={true}
          style={{ ...inputStyle }}
          placeholder={customPlaceholder}
          ref={inputRef}
          fill="outline"
        />
        &nbsp;
        <IonButton
          type="submit"
          aria-label="submit"
          shape="round"
          expand="full"
          style={{ minHeight: '44px', margin: 0 }}
        >
          <IonIcon icon={icon}></IonIcon>
          {buttonText}
        </IonButton>
      </div>
    </form>
  )
}
