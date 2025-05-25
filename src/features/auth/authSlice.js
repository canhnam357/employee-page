import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/api';
import { toast } from 'react-toastify';

const decodeJWT = (token) => {
    try {
        const base64Url = token.split('.')[1]; // Lấy phần Payload
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // Thay thế ký tự
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload); // Trả về object payload
    } catch (error) {
        console.error('Lỗi giải mã JWT:', error);
        return null;
    }
};

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const { accessToken, refreshToken, username } = response.data.result;
        const decode = decodeJWT(accessToken);
        if (decode.user_role !== "ADMIN" && decode.user_role !== "EMPLOYEE") {
          const message = 'Bạn không có quyền truy cập';
          toast.dismiss();
          toast.error(message);
          return rejectWithValue(message);
        }
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('username', username); // Lưu username vào localStorage
        toast.success('Đăng nhập thành công!');
        return { username };
      }
      return rejectWithValue(response.data.message);
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng nhập thất bại!';
      const statusCode = error.response?.data?.statusCode;
      if (statusCode === 404) {
        toast.error('Email không tồn tại!');
      } else if (statusCode === 403) {
        toast.error('Bạn không có quyền truy cập! Chỉ ADMIN hoặc EMPLOYEE mới được phép đăng nhập.');
      } else {
        toast.error(message);
      }
      return rejectWithValue(message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await api.post('/auth/logout', null, { params: { refreshToken } });
      if (response.status === 200) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username'); // Xóa username khi đăng xuất
        toast.success('Đăng xuất thành công!');
        return true;
      }
      return rejectWithValue('Đăng xuất thất bại!');
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng xuất thất bại!';
      toast.error(message);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('username'); // Xóa username khi có lỗi
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: localStorage.getItem('username') ? { username: localStorage.getItem('username') } : null,
    isAuthenticated: !!localStorage.getItem('accessToken'),
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload;
      });
  },
});

export default authSlice.reducer;