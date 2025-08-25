import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './modules/App'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Admin from './modules/admin/Admin'
import { UploadPage } from './modules/upload/UploadPage'
 
const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/upload', element: <UploadPage /> },
  { path: '/admin/*', element: <Admin /> }
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
