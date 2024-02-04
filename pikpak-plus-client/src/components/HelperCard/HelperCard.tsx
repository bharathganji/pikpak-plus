import {
  IonCard,
  IonCardContent,
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
  titleColor?: string,
  cardContent?: any
}

function HelperCard({
  cardTitle,
  cardStyle,
  titleColor,
  cardSubtitle,
  cardSubTitleStyle,
  cardContent,
  icon,
}: HelperCardProps) {
  return (
    <div className="helper-card">
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
        <IonCardContent>{cardContent}</IonCardContent>
      </IonCard>
    </div>
  )
}

export default HelperCard
