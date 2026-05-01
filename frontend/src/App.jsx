import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { EventProvider } from './context/EventContext'
import Layout        from './components/layout/Layout'
import VueGlobale    from './pages/VueGlobale'
import Billetterie   from './pages/Billetterie'
import Consommation  from './pages/Consommation'
import ProfilClient  from './pages/ProfilClient'
import Invitations   from './pages/Invitations'
import Stocks        from './pages/Stocks'
import Restitution   from './pages/Restitution'
import Historique    from './pages/Historique'
import Parametres    from './pages/Parametres'
import Evenements    from './pages/Evenements'

export default function App() {
  return (
    <BrowserRouter>
      <EventProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index                element={<VueGlobale />}    />
            <Route path="evenements"    element={<Evenements />}    />
            <Route path="billetterie"   element={<Billetterie />}   />
            <Route path="consommation"  element={<Consommation />}  />
            <Route path="profil-client" element={<ProfilClient />}  />
            <Route path="invitations"   element={<Invitations />}   />
            <Route path="stocks"        element={<Stocks />}        />
            <Route path="restitution"   element={<Restitution />}   />
            <Route path="historique"    element={<Historique />}    />
            <Route path="parametres"    element={<Parametres />}    />
          </Route>
        </Routes>
      </EventProvider>
    </BrowserRouter>
  )
}
