import React, { useMemo, lazy, Suspense } from 'react'
import {
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { listCircle, folderOpen, magnetOutline, search } from 'ionicons/icons'
import { Redirect, Route } from 'react-router'
import { getauthCookie, isJWTValid } from './helpers/helpers'
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner'

const DownloadList = lazy(() => import('./components/TasksList/taskslist'))
const AddUrlForm = lazy(() => import('./components/AddURL/addUrl'))
const BrowseFolders = lazy(
  () => import('./components/BrowseFolders/BrowseFolders'),
)
const Search = lazy(() => import('./components/Search/Search'))
const Login = lazy(() => import('./components/authentication/login/Login'))
const SignUp = lazy(() => import('./components/authentication/signUp/SignUp'))

const App: React.FC = () => {
  const isEnable = useMemo(() => isJWTValid(getauthCookie()), [])
  const isIgnoreList = ['/login', '/signup']

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
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Redirect exact path="/" to="/create" />

            {renderRoute('/tasks', DownloadList)}
            {renderRoute('/create', AddUrlForm)}
            {renderRoute('/login', Login)}
            {renderRoute('/signup', SignUp)}
            {renderRoute('/browse', BrowseFolders)}
            {renderRoute('/search', Search)}
          </IonRouterOutlet>

          <IonTabBar slot="bottom">
            {renderTabButton('tasks', listCircle, 'Tasks')}
            {renderTabButton('create', magnetOutline, 'Magnet')}
            {renderTabButton('browse', folderOpen, 'Folders')}
            {renderTabButton('search', search, 'Search')}
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </>
  )
}

export default App
