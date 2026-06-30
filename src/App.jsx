import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
       <ToastContainer
    position="top-right"
    autoClose={3000}
    hideProgressBar={true}
    newestOnTop
    closeOnClick
    pauseOnHover={false}
    draggable={false}
    theme="colored"
/>
      </BrowserRouter>
    </AuthProvider>
  );
}
