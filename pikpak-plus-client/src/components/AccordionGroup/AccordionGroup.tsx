import { IonAccordion, IonItem, IonLabel } from '@ionic/react'
import './AccordionGroup.css'
interface AccordianType {
  title: string
  value: string
  link?: string
  type: string
  answer?: string
}
function AccordionGroup({ title, value, link, type, answer }: AccordianType) {
  return (
    <>
      <IonAccordion value={value}>
        <IonItem slot="header" color="light">
          <IonLabel>{title}</IonLabel>
        </IonItem>

        <div className="ion-padding" slot="content">
          {type === 'video' ? (
            <iframe
              src={link}
              width="100%"
              height="315"
              title={title}
              allowFullScreen
            ></iframe>
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: answer?.toString() || '' }}
            ></div>
          )}
        </div>
      </IonAccordion>
    </>
  )
}
export default AccordionGroup
