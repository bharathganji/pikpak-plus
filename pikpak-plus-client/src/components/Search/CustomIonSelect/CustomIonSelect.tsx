import React from 'react'
import { IonSelect, IonSelectOption } from '@ionic/react'
import { add, remove } from 'ionicons/icons'
import './CustomIonSelect.css'

interface SelectProps {
  label: string
  placeholder: string
  options: { code: string; value: string }[]
  multiple: boolean
  setSelected: React.Dispatch<React.SetStateAction<string[]>>
  isDisabled?: boolean
}

const CustomIonSelect: React.FC<SelectProps> = ({
  label,
  placeholder,
  options,
  multiple,
  setSelected,
  isDisabled = false,
}) => {
  return (
    <IonSelect
      aria-label={label}
      placeholder={placeholder}
      multiple={multiple}
      interfaceOptions={{ header: label }}
      fill="outline"
      toggleIcon={add}
      expandedIcon={remove}
      onIonChange={(ev) => {
        setSelected(ev.detail.value as string[])
      }}
      disabled={isDisabled}
    >
      {options.map((option) => (
        <IonSelectOption key={option.code} value={option.code}>
          {option.value}
        </IonSelectOption>
      ))}
    </IonSelect>
  )
}

export default CustomIonSelect
