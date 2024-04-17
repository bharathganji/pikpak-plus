import React, { useMemo, lazy, Suspense } from 'react'
import {
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonText,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import {
  listCircle,
  folderOpen,
  magnetOutline,
  search,
  ellipsisHorizontal,
} from 'ionicons/icons'
import { Redirect, Route } from 'react-router'
import { getauthCookie, isJWTValid } from './helpers/helpers'
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner'
import DonationForm from './components/MoreOptionsPage/DonationForm/DonationForm'
import './App.css'

const DownloadList = lazy(() => import('./components/TasksList/taskslist'))
const AddUrlForm = lazy(() => import('./components/AddURL/addUrl'))
const BrowseFolders = lazy(
  () => import('./components/BrowseFolders/BrowseFolders'),
)
const Search = lazy(() => import('./components/Search/Search'))
const Login = lazy(() => import('./components/authentication/login/Login'))
const SignUp = lazy(() => import('./components/authentication/signUp/SignUp'))
const MoreOptions = lazy(
  () => import('./components/MoreOptionsPage/MoreOptionsPage'),
)

const App: React.FC = () => {
  const isEnable = useMemo(() => isJWTValid(getauthCookie()), [])
  const isIgnoreList = ['/login', '/signup']

  // Use matchMedia to check the user preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

  toggleDarkTheme(prefersDark.matches)

  // Listen for changes to the prefers-color-scheme media query
  prefersDark.addEventListener('change', (mediaQuery) =>
    toggleDarkTheme(mediaQuery.matches),
  )

  // Add or remove the "dark" class based on if the media query matches
  function toggleDarkTheme(shouldAdd) {
    document.body.classList.toggle('dark', shouldAdd)
  }

  const renderRoute = (path: string, component: React.FC, exact = true) => (
    <Route
      path={path}
      render={() =>
        isEnable !== isIgnoreList.includes(path) ? (
          <Suspense fallback={<LoadingSpinner />}>
            {React.createElement(component)}
          </Suspense>
        ) : isEnable ? (
          <Redirect to="/create" />
        ) : (
          <Redirect to="/login" />
        )
      }
      exact={exact}
    />
  )

  const renderTabButton = (tab: string, icon: string, label: string) => (
    <IonTabButton tab={tab} href={`/${tab}`}>
      <IonIcon icon={icon} color="black" />
      <IonLabel>{label}</IonLabel>
    </IonTabButton>
  )

  return (
    <>
      <IonText>
        <h1 className="header-text">Welcome to PikPak Plus</h1>
      </IonText>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Redirect exact path="/" to="/create" />
            <Route path="/donate" component={DonationForm} />
            {renderRoute('/tasks', DownloadList)}
            {renderRoute('/create', AddUrlForm)}
            {renderRoute('/login', Login)}
            {renderRoute('/signup', SignUp)}
            {renderRoute('/browse', BrowseFolders)}
            {renderRoute('/search', Search)}
            {renderRoute('/config', MoreOptions)}
          </IonRouterOutlet>

          <IonTabBar slot="bottom">
            {renderTabButton('tasks', listCircle, 'Tasks')}
            {renderTabButton('create', magnetOutline, 'Magnet')}
            {renderTabButton('browse', folderOpen, 'Folders')}
            {renderTabButton('search', search, 'Search')}
            {renderTabButton('config', ellipsisHorizontal, 'More')}
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </>
  )
}

export default App
