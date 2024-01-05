import { IonCheckbox } from '@ionic/react'

import './Checkbox.css'

interface CheckboxProps {
  customData: Array<{
    Website: string
    Keyword: string
    Url: string
    Example: string
  }>
  SelectedWebsite: string[]
  setSelectedWebsite: any
}

const Checkbox = (props: CheckboxProps) => {
  return (
    <div className="custom-checkbox">
      {props.customData.map((website, index) => (
        <IonCheckbox
          labelPlacement="start"
          onIonChange={(e) => {
            console.log(e.target.value)
          }}
          disabled={website.Keyword !== 'all' ? true : false}
          // ionChange={(event) => {
          //   console.log(props.SelectedWebsite)
          //   if (event.currentTarget.checked) {
          //     console.log(props.SelectedWebsite)
          //   }
          // props.setSelectedWebsite([
          //   ...props.SelectedWebsite,
          //   website.Website,
          // ])
          // }}
          key={index}
        >
          {website.Website}
        </IonCheckbox>
      ))}
    </div>
  )
}

export default Checkbox
