import axios from 'axios';
import { store } from '../store';
import { logoutUser } from '../features/auth/authSlice';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL_BASE,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Xử lý lỗi 401 (Unauthorized)
    if (
      (error.response?.status === 401 || error.response?.data?.statusCode === 401) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      console.log('Lỗi 401: Access Token hết hạn, đang thử refresh token...');

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('Không tìm thấy refresh token, đăng xuất...');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        store.dispatch(logoutUser());
        toast.dismiss();
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
        window.location.href = '/login';
        return Promise.reject(new Error('Không tìm thấy refresh token'));
      }

      try {
        console.log('Gửi yêu cầu refresh token...');
        const response = await axios.post(process.env.REACT_APP_API_URL_BASE + '/auth/refresh-access-token', {
          token: refreshToken,
        });
        console.log('Refresh token thành công:', response.data);
        const { accessToken, refreshToken: newRefreshToken } = response.data.result;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Lỗi khi refresh token:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        store.dispatch(logoutUser());
        toast.dismiss();
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Xử lý lỗi 403 (Forbidden)
    if (error.response?.status === 403 || error.response?.data?.statusCode === 403) {
      console.log('Lỗi 403: Quyền truy cập bị từ chối, đăng xuất...');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      store.dispatch(logoutUser());
      toast.dismiss();
      toast.error('Quyền truy cập bị từ chối. Vui lòng đăng nhập lại!');
      window.location.href = '/login';
      return Promise.reject(new Error('Quyền truy cập bị từ chối'));
    }

    return Promise.reject(error);
  }
);

export default api;