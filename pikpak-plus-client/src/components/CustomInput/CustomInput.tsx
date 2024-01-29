import { useRef } from 'react'
import { IonInput, IonButton, IonIcon } from '@ionic/react'
import './CustomInput.css'

export default function CustomInput({
  // text,
  // handleTextChange,
  handleSubmit,
  icon,
  customPlaceholder,
}: any) {
  const inputRef = useRef<HTMLIonInputElement>(null) // Adjust the ref type

  // const handleInputChange = (event: CustomEvent) => {

  //   const newValue = (event.target as HTMLInputElement).value
  //   console.log(newValue);
  //   handleTextChange(newValue)
  // }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit(inputRef.current?.value)
        inputRef.current?.value ? inputRef.current.value = '' : null
      }}
    >
      <div className="container ">
        <div className="centered-element">
          <IonInput
            type="text"
            placeholder={customPlaceholder}
            ref={inputRef}
            style={{ background: '#e0e0e0' }}
          />
          <IonButton type="submit" style={{ minHeight: '44px', margin: 0 }}>
            <IonIcon icon={icon}></IonIcon>
          </IonButton>
        </div>
      </div>
    </form>
  )
}
