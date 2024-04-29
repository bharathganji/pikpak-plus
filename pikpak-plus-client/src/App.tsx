import React, { useMemo, lazy, Suspense, useEffect } from 'react'
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
import {
  getWindowIsDarkThemeMode,
  getauthCookie,
  isJWTValid,
  setItemToLocalStorage,
} from './helpers/helpers'
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner'
import DonationForm from './components/MoreOptionsPage/DonationForm/DonationForm'
import './App.css'
import FaqPage from './components/FaqPage/FaqPage'

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

  useEffect(() => {
    getWindowIsDarkThemeMode() === 'true'
      ? setItemToLocalStorage('darkMode', 'true')
      : setItemToLocalStorage('darkMode', 'false')
  }, [])

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
            <Route path="/faq" component={FaqPage} />
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
