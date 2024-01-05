import AuthCard from '../../AuthCard/AuthCard'

export default function SignUpCard({ callbackFunc }: { callbackFunc: any }) {
  return (
    <>
      <AuthCard
        titleHeading="Sign Up"
        nextTitle={{ text: 'Login', redirect: '/login' }}
        callbackFunc={callbackFunc}
      />
    </>
  )
}
