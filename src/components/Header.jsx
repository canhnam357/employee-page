import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/employee/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <h1 className="header-title">Quản lý đơn hàng (Nhân viên)</h1>
        {isAuthenticated && (
          <div className="header-user">
            <span>Xin chào, {user?.username}</span>
            <button onClick={handleLogout} className="header-logout-button">
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;