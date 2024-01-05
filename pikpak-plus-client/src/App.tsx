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
import {
  cloudDownload,
  listCircle,
  folderOpen,
  magnetOutline,
  search,
} from 'ionicons/icons'
import { Redirect, Route } from 'react-router'
import { getauthCookie, isJWTValid } from './helpers/helpers'

const DownloadList = lazy(() => import('./components/TasksList/taskslist'))
const AddUrlForm = lazy(() => import('./components/AddURL/addUrl'))
const BrowseFolders = lazy(
  () => import('./components/BrowseFolders/BrowseFolders'),
)
const Downloader = lazy(() => import('./components/Downloader/Downloader'))
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
          <Suspense fallback={<div>Loading...</div>}>
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
      <IonIcon icon={icon} />
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
            {renderRoute('/downloader', Downloader)}
            {renderRoute('/browse', BrowseFolders)}
            {renderRoute('/search', Search)}
          </IonRouterOutlet>

          <IonTabBar slot="bottom">
            {renderTabButton('tasks', listCircle, 'Tasks')}
            {renderTabButton('downloader', cloudDownload, 'Downloader')}
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
