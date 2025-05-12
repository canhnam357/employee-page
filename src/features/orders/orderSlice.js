import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/api';
import { toast } from 'react-toastify';

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async ({ index = 1, size = 10, orderStatus = '' }, { rejectWithValue }) => {
    try {
      const response = await api.get('/employee/orders', {
        params: { index, size, orderStatus },
      });
      return response.data.result;
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể lấy danh sách đơn hàng!';
      return rejectWithValue(message);
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, fromStatus, toStatus, cause }, { rejectWithValue, dispatch, getState }) => {
    try {
      const response = await api.put('/order/change-order-status', {
        orderId,
        fromStatus,
        toStatus,
        cause: cause || null,
      });
      if (response.status === 204) {
        const statusLabels = {
          IN_PREPARATION: 'Đang chuẩn bị hàng',
          READY_TO_SHIP: 'Sẵn sàng giao',
          REJECTED: 'Bị từ chối',
          RETURNED: 'Đã hoàn hàng',
        };
        toast.success(`Đã cập nhật trạng thái đơn hàng thành ${statusLabels[toStatus] || toStatus}!`);
        const { currentPage, pageSize, orderStatusFilter } = getState().orders;
        dispatch(fetchOrders({ index: currentPage, size: pageSize, orderStatus: orderStatusFilter }));
        return { orderId, toStatus };
      }
      throw new Error('Không thể cập nhật trạng thái đơn hàng!');
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng!';
      const statusCode = error.response?.data?.statusCode || error.response?.status;
      if (statusCode === 404) {
        return rejectWithValue('Đơn hàng không tồn tại!');
      } else if (statusCode === 400) {
        return rejectWithValue('Trạng thái hiện tại của đơn hàng không khớp!');
      } else if (statusCode === 500) {
        return rejectWithValue('Lỗi server! Vui lòng thử lại sau.');
      }
      return rejectWithValue(message);
    }
  }
);

export const fetchOrderDetails = createAsyncThunk(
  'orders/fetchOrderDetails',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/order/${orderId}`);
      return response.data.result;
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể lấy chi tiết đơn hàng!';
      const statusCode = error.response?.data?.statusCode;
      if (statusCode === 404) {
        return rejectWithValue('Đơn hàng không tồn tại!');
      } else if (statusCode === 403) {
        return rejectWithValue('Bạn không có quyền xem chi tiết đơn hàng này!');
      }
      return rejectWithValue(message);
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    orders: [],
    totalElements: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
    orderStatusFilter: '',
    orderDetails: [],
    loading: false,
    loadingDetails: false,
    error: null,
    errorDetails: null,
  },
  reducers: {
    clearOrderDetails(state) {
      state.orderDetails = [];
      state.errorDetails = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.content || [];
        state.totalElements = action.payload.totalElements || 0;
        state.totalPages = action.payload.totalPages || 0;
        state.currentPage = action.payload.number + 1 || 1;
        state.pageSize = action.meta.arg.size || 10;
        state.orderStatusFilter = action.meta.arg.orderStatus || '';
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchOrderDetails.pending, (state) => {
        state.loadingDetails = true;
        state.errorDetails = null;
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.loadingDetails = false;
        state.orderDetails = action.payload || [];
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.loadingDetails = false;
        state.errorDetails = action.payload;
        toast.error(action.payload);
      });
  },
});

export const { clearOrderDetails } = orderSlice.actions;
export default orderSlice.reducer;