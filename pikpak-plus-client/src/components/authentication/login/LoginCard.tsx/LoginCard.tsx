import AuthCard from '../../AuthCard/AuthCard'

export default function LoginCard({ callbackFunc }: { callbackFunc: any }) {
  return (
    <>
      <AuthCard
        titleHeading="Login"
        callbackFunc={callbackFunc}
        nextTitle={{ text: 'Sign Up', redirect: '/signup' }}
      />
    </>
  )
}
