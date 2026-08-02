import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import ValuationCalculator from './pages/ValuationCalculator';
import Dashboard from './pages/Dashboard';
import Investments from './pages/Investments';
import InvestmentDetail from './pages/InvestmentDetail';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              <Route path="/valuation" element={<ValuationCalculator />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/investments/:id" element={<InvestmentDetail />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/tenant" element={<Dashboard forcedRole="tenant" />} />
              <Route path="/dashboard/landlord" element={<Dashboard forcedRole="landlord" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
