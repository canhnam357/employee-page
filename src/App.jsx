import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header';
import Login from './features/auth/login/Login';
import OrderList from './features/orders/OrderList';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<OrderList />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
        <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      className="custom-toast-container"
      style={{ zIndex: 99999 }} // Tăng z-index để đảm bảo không bị che
    />
      </div>
    </Router>
  );
}

export default App;