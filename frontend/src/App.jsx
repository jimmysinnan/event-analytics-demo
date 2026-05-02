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
import Import        from './pages/Import'
import Settings      from './pages/Settings'
import Evenements    from './pages/Evenements'

export default function App() {
  return (
    <BrowserRouter>
      <EventProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index                element={<VueGlobale />}   />
            <Route path="evenements"    element={<Evenements />}   />
            <Route path="billetterie"   element={<Billetterie />}  />
            <Route path="consommation"  element={<Consommation />} />
            <Route path="profil-client" element={<ProfilClient />} />
            <Route path="invitations"   element={<Invitations />}  />
            <Route path="stocks"        element={<Stocks />}       />
            <Route path="restitution"   element={<Restitution />}  />
            <Route path="importer-donnees" element={<Import />}      />
            <Route path="parametres"    element={<Settings />}     />
          </Route>
        </Routes>
      </EventProvider>
    </BrowserRouter>
  )
}
