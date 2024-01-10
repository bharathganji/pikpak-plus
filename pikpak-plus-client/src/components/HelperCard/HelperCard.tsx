import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
} from '@ionic/react'
import './HelperCard.css'

interface HelperCardProps {
  cardTitle?: string
  cardStyle?: React.CSSProperties
  cardSubtitle?: any
  cardSubTitleStyle?: React.CSSProperties
  icon?: string
  titleColor?: string
}

function HelperCard({
  cardTitle,
  cardStyle,
  titleColor,
  cardSubtitle,
  cardSubTitleStyle,
  icon,
}: HelperCardProps) {
  return (
    <div className="helper-card container">
      <IonCard style={cardStyle}>
        <IonCardHeader>
          <IonCardTitle
            color={titleColor}
            style={{
              display: 'flex',
              gap: 5,
              alignItems: 'center',
            }}
          >
            {cardTitle}
            <IonIcon icon={icon} />
          </IonCardTitle>
          <IonCardSubtitle style={cardSubTitleStyle}>
            {cardSubtitle}
          </IonCardSubtitle>
        </IonCardHeader>
      </IonCard>
    </div>
  )
}

export default HelperCard
