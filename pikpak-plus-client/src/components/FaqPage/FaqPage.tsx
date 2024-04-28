import { IonAccordionGroup, IonContent, IonText } from '@ionic/react'
import './FaqPage.css'
import AccordionGroup from '../AccordionGroup/AccordionGroup'

const faqList = [
  {
    title: 'What is PikPak Plus?',
    type: 'text',
    value: 'first',
    answer: `Unofficial implementation of PikPak cloud and it's services.<br/>
    pikpak-plus provides ability to host and share your PikPak [Premium] with your friends and family!
    `,
  },
  {
    title: 'How to create pikpak-plus new account?',
    type: 'video',
    value: 'second',
    link: 'https://www.youtube.com/embed/gnkqv3YTnGA',
  },
  {
    title: 'How to use pikpak webdav with Nova video player[android]?',
    type: 'video',
    value: 'third',
    link: 'https://www.youtube.com/embed/o7I87uHANcQ',
  },
  {
    title: 'How to use pikpak webdav in windows [RaiDrive]?',
    type: 'video',
    value: 'fourth',
    link: 'https://www.youtube.com/embed/eJ2xr4H2cDA',
  },
  {
    title: 'In case of any problem with pikpak-plus',
    type: 'text',
    value: 'fifth',
    answer: `<strong>Clear browser cookies,
    then try again. </strong> else Please contact us through 
    <a href="https://github.com/bharathganji/pikpak-plus/issues">GitHub</a> or
    <a href="https://t.me/pikpak_plus">Telegram</a> or
    <a href="mailto:bharathganji1@gmail.com">Mail</a> .`,
  },
  {
    title: 'Can i purchase WebDav from pikpak-plus',
    type: 'text',
    value: 'sixth',
    answer: `<strong>yes, you can.</strong><br/>
    contact us through
    <a href="https://t.me/pikpak_plus">Telegram</a> or
    <a href="mailto:bharathganji1@gmail.com">Mail</a>.
    `,
  },
  {
    title: 'Anroid App Avialable?',
    type: 'text',
    value: 'seventh',
    answer: `<strong>yes..</strong><br/>
    download link
    <a href='https://github.com/bharathganji/pikpak-plus/raw/main/pikpak-plus-client/android/app/release/app-release.apk'>Download</a>.
    `,
  },
  {
    title: 'Is it harm to use pikpak-plus',
    type: 'text',
    value: 'eighth',
    answer: `<strong>NO..</strong>
    Nothing more than a free service.😉<br/>
    <h3>Do's and Dont's</h3>
    <li>pikpak-plus never store your login credentials.</li>
    <li>pikpak-plus never share your data and information.</li>
    <li>pikpak-plus never ask for money.</li>
    `,
  },
]
function FaqPage() {
  return (
    <>
      <IonContent fullscreen={true}>
        <div className="custom-container">
          <IonText color={'primary'}>
            <h1>Frequently Asked Questions</h1>
          </IonText>
          <IonAccordionGroup>
            {faqList.map((item, index) => (
              <AccordionGroup key={index} {...item} />
            ))}
          </IonAccordionGroup>
        </div>
      </IonContent>
    </>
  )
}

export default FaqPage
