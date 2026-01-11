import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Navbar  from './components/ui/navbar/navbar';

import  Payment  from './pages/Payment/PaymentFinish';
import  Paymenteror  from './pages/Payment/PaymentEror';
import { Quiz } from './pages/quiz';
import Footer from './components/ui/footer';
import { Rumah } from './pages/Rumahukai';
import { Beranda } from './pages/Beranda';
import { Landasan } from './pages/Landing';
import { Login } from './pages/Login';


import { Profile } from './pages/profile';


import { Quizreview } from './pages/Quizreview';
import { Paketku } from './pages/Beranda/Paketku';
import {Paket} from './pages/Paket';

import {Quizattempt} from './pages/QuizNpdf';
import {Pdf} from './pages/QuizNpdf/Pdfview';
import './index.css'
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import ProtectedRoute from './components/login/ProtectedRoute';


// Create a custom theme
const theme = createTheme({
  typography: {
    fontFamily: 'Poppins',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: 'Poppins, sans-serif',
          textTransform: 'none',
        },
      },
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      // <ProtectedRoute>
        <>
          <Navbar />
          <Landasan />
          <Footer />
        </>
      // </ProtectedRoute>
    )
  },
    {
    path: '/produk',
    element: (
      // <ProtectedRoute>
        <>
          <Navbar />
          <Beranda />
          <Footer />
        </>
      // </ProtectedRoute>
    )
  },
    {
    path: '/tentang-kami',
    element: (
      // <ProtectedRoute>
        <>
          <Navbar />
          <Rumah />
          <Footer />
        </>
      // </ProtectedRoute>
    )
  },
  {
    path: '/quiz',
    element: (
      <ProtectedRoute>
      <>
        {/* <Navbar /> */}
        <Quiz />
        {/* <Footer/> */}
      </>
      </ProtectedRoute>
    )
  },
  {
    path: '/review',
    element: (
      <ProtectedRoute>
      <>
        {/* <Navbar /> */}
        <Quizreview />
        {/* <Footer/> */}
      </>
     </ProtectedRoute>
    )
  },
  {
    path: '/daftar-paketku',
    element: (
      <ProtectedRoute>
      <>
        <Navbar />
        <Paketku />
        <Footer/>
      </>
      </ProtectedRoute>
    )
  },
  

  
  {
    path: '/pdfviewer',
    element: (
      <ProtectedRoute>
      <>
        {/* <Navbar /> */}
        <Pdf />
        {/* <Footer/> */}
      </>
      </ProtectedRoute>
    )
  },
 
  {
    path: '/pembayaran-selesai',
    element: (
      <ProtectedRoute>
      <>
        {/* <Navbar /> */}
        <Payment />
        {/* <Footer/> */}
      </>
      </ProtectedRoute>
    )
  },
   {
    path: '/pembayaran-gagal',
    element: (
      <ProtectedRoute>
      <>
        {/* <Navbar /> */}
        <Paymenteror />
        {/* <Footer/> */}
      </>
      </ProtectedRoute>
    )
  },
  {
    path: '/paketku',
    element: (
    <ProtectedRoute>
    <>
    <Navbar />
    <Paket/>
    <Footer/>
    </>
   </ProtectedRoute>
    )
  
    },
    {
      path: '/tryouts',
      element: (
        <ProtectedRoute>
        <>
          <Navbar/>
          <Quizattempt/>
          <Footer/>
        </>
        </ProtectedRoute>
      )
    },
   
    {
      path: '/profile',
      element: (
        <ProtectedRoute>
        <>
          <Navbar/>
          <Profile />
                <Footer/>
        </>
        </ProtectedRoute>
      )
    },
 
   
   
  {
    path: '/login',
    element: <Login />,
  },

 
 
]);

function App() {
  return (
    // Provide the custom theme to the entire app
   
    <ThemeProvider theme={theme}>
        {/* <div className="app-wrapper"> */}
      <RouterProvider router={router} />
      {/* </div> */}
    </ThemeProvider>
      
  );
}

export default App;
