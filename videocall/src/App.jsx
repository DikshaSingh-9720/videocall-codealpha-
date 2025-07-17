import LandingPage from './pages/LandingPage'
import Authentication from "./pages/Authentication"
import Dashboard from "./pages/Dashboard"
import History from "./pages/History"
import VideoMeet from "./pages/VideoMeet"
import { AuthProvider } from "./context/Authcontext"
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import GoogleAuthHandler from "./pages/GoogleAuthHandler";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Authentication />} />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/history' element={<History />} />
            <Route path="/:url" element={<VideoMeet />} />
            <Route path="/auth/google" element={<GoogleAuthHandler />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            pauseOnHover
            theme="light"
          />
        </AuthProvider>
      </BrowserRouter>
    </>
  )
}

export default App;