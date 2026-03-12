import React from 'react'
import Sidebar from "./components/Layouts/Sidebar";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
      </div>
    </div>
  )
}

export default App