import React from 'react'
import './App.css'
import Structure from './layout/Structure'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './Pages/HomePage'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
      <Structure />
    </BrowserRouter>
  )
}

export default App
