import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus, fetchOrderDetails, clearOrderDetails } from './orderSlice';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './OrderList.css';

const OrderList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orders, totalPages, currentPage, orderDetails, loading, loadingDetails, orderStatusFilter } = useSelector(
    (state) => state.orders
  );
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderData, setRejectOrderData] = useState({ orderId: null, fromStatus: '', cause: '' });

  const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'REJECTED', label: 'Bị từ chối' },
    { value: 'IN_PREPARATION', label: 'Đang chuẩn bị hàng' },
    { value: 'READY_TO_SHIP', label: 'Chuẩn bị giao' },
    { value: 'DELIVERING', label: 'Đang giao' },
    { value: 'DELIVERED', label: 'Đã giao' },
    { value: 'CANCELLED', label: 'Đã huỷ' },
    { value: 'FAILED_DELIVERY', label: 'Giao thất bại' },
    { value: 'RETURNED', label: 'Đã hoàn hàng' },
  ];

  const statusLabels = {
    PENDING: 'Chờ duyệt',
    REJECTED: 'Bị từ chối',
    IN_PREPARATION: 'Đang chuẩn bị hàng',
    READY_TO_SHIP: 'Chuẩn bị giao',
    DELIVERING: 'Đang giao',
    DELIVERED: 'Đã giao',
    CANCELLED: 'Đã huỷ',
    FAILED_DELIVERY: 'Giao thất bại',
    RETURNED: 'Đã hoàn hàng',
  };

  const paymentMethodLabels = {
    CARD: 'Thẻ',
    COD: 'Tiền mặt',
  };

  const paymentStatusLabels = {
    SUCCESS: 'Thành công',
    PENDING: 'Chờ xử lý',
    FAILED: 'Thất bại',
  };

  const refundStatusLabels = {
    NONE: 'Không hoàn',
    PENDING_REFUND: 'Chờ hoàn',
    REFUNDED: 'Đã hoàn',
    FAILED_REFUND: 'Hoàn thất bại',
  };

  const statusActions = {
    PENDING: [
      { toStatus: 'IN_PREPARATION', label: 'Chuẩn bị hàng' },
      { toStatus: 'REJECTED', label: 'Từ chối', restricted: true },
    ],
    IN_PREPARATION: [
      { toStatus: 'READY_TO_SHIP', label: 'Sẵn sàng giao' },
      { toStatus: 'REJECTED', label: 'Từ chối', restricted: true },
    ],
    READY_TO_SHIP: [
      { toStatus: 'REJECTED', label: 'Từ chối', restricted: true },
    ],
    FAILED_DELIVERY: [
      { toStatus: 'RETURNED', label: 'Hoàn hàng' },
    ],
  };

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchOrders({ index: currentPage, size: 10, orderStatus: orderStatusFilter }));
    }
  }, [dispatch, isAuthenticated, currentPage, orderStatusFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      dispatch(fetchOrders({ index: newPage, size: 10, orderStatus: orderStatusFilter }));
    }
  };

  const handleStatusFilterChange = (e) => {
    dispatch(fetchOrders({ index: 1, size: 10, orderStatus: e.target.value }));
  };

  const handleOpenRejectModal = (orderId, fromStatus) => {
    setRejectOrderData({ orderId, fromStatus, cause: '' });
    setShowRejectModal(true);
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setRejectOrderData({ orderId: null, fromStatus: '', cause: '' });
  };

  const handleStatusChange = async (orderId, fromStatus, toStatus) => {
    if (toStatus === 'REJECTED') {
      handleOpenRejectModal(orderId, fromStatus);
      return;
    }
    try {
      await dispatch(updateOrderStatus({ orderId, fromStatus, toStatus })).unwrap();
      toast.success('Cập nhật trạng thái đơn hàng thành công!');
    } catch (error) {
      toast.dismiss();
      toast.error(error || 'Lỗi khi cập nhật trạng thái đơn hàng!');
    }
  };

  const handleRejectOrder = async () => {
    const { orderId, fromStatus, cause } = rejectOrderData;
    if (!cause.trim()) {
      toast.dismiss();
      toast.error('Vui lòng nhập lý do từ chối!');
      return;
    }
    try {
      await dispatch(
        updateOrderStatus({ orderId, fromStatus, toStatus: 'REJECTED', cause })
      ).unwrap();
      handleCloseRejectModal();
      toast.success('Từ chối đơn hàng thành công!');
    } catch (error) {
      toast.dismiss();
      toast.error(error || 'Lỗi khi từ chối đơn hàng!');
    }
  };

  const handleViewDetails = async (orderId) => {
    if (selectedOrderId === orderId) {
      setSelectedOrderId(null);
      dispatch(clearOrderDetails());
    } else {
      setSelectedOrderId(orderId);
      try {
        await dispatch(fetchOrderDetails(orderId)).unwrap();
      } catch (error) {
        toast.dismiss();
        toast.error(error || 'Lỗi khi lấy chi tiết đơn hàng!');
      }
    }
  };

  const truncateAddress = (address) => {
    if (address.length > 30) {
      return address.substring(0, 30) + '...';
    }
    return address;
  };

  const canReject = (order) => {
    if (order.paymentMethod === 'CARD') {
      return order.paymentStatus === 'SUCCESS';
    }
    return true;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const formatOrderAt = (dateString) => {
    if (!dateString) return 'N/A';
    const dateRegex = /^(\d{2}):(\d{2}):(\d{2}) (\d{2})-(\d{2})-(\d{4})$/;
    if (dateRegex.test(dateString)) {
      return dateString;
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${hours}:${minutes}:${seconds} ${day}-${month}-${year}`;
    } catch {
      return 'N/A';
    }
  };

  if (loading) return <p>Đang tải danh sách đơn hàng...</p>;

  return (
    <div className="order-list-container">
      <h2>Danh sách đơn hàng</h2>
      <div className="order-list-filter">
        <label>Lọc theo trạng thái:</label>
        <select value={orderStatusFilter} onChange={handleStatusFilterChange} className="order-status-select">
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {orders.length === 0 ? (
        <p>Không có đơn hàng nào!</p>
      ) : (
        <>
          <table className="order-table">
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Trạng thái đơn hàng</th>
                <th>Phương thức thanh toán</th>
                <th>Trạng thái thanh toán</th>
                <th>Trạng thái hoàn tiền</th>
                <th>Thời gian hoàn tiền</th>
                <th>Địa chỉ</th>
                <th>Số điện thoại</th>
                <th>Ngày đặt hàng</th>
                <th>Tổng tiền</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <>
                  <tr key={order.orderId}>
                    <td>{order.orderId}</td>
                    <td>
                      <span className={`order-status-badge order-status-${order.orderStatus.toLowerCase()}`}>
                        {statusLabels[order.orderStatus]}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-method-badge payment-method-${order.paymentMethod.toLowerCase()}`}>
                        {paymentMethodLabels[order.paymentMethod]}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-status-badge payment-status-${order.paymentStatus.toLowerCase()}`}>
                        {paymentStatusLabels[order.paymentStatus]}
                      </span>
                    </td>
                    <td>
                      <span className={`refund-status-badge refund-status-${order.refundStatus.toLowerCase()}`}>
                        {refundStatusLabels[order.refundStatus]}
                      </span>
                    </td>
                    <td>
                      {order.refundAt ? formatOrderAt(order.refundAt) : '-'}
                    </td>
                    <td>{truncateAddress(order.address)}</td>
                    <td>{order.phoneNumber}</td>
                    <td>{formatOrderAt(order.orderAt)}</td>
                    <td>{order.totalPrice.toLocaleString('vi-VN')} VNĐ</td>
                    <td>
                      <div className="order-actions">
                        <button
                          className="order-action-details"
                          onClick={() => handleViewDetails(order.orderId)}
                        >
                          {selectedOrderId === order.orderId ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                        </button>
                        {statusActions[order.orderStatus] && (
                          <>
                            {statusActions[order.orderStatus].map((action) => (
                              <button
                                key={action.toStatus}
                                className={
                                  action.toStatus === 'REJECTED' || action.toStatus === 'CANCELLED'
                                    ? 'order-action-cancel'
                                    : 'order-action-approve'
                                }
                                onClick={() =>
                                  handleStatusChange(order.orderId, order.orderStatus, action.toStatus)
                                }
                                disabled={action.restricted && !canReject(order)}
                              >
                                {action.label}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {selectedOrderId === order.orderId && (
                    <tr>
                      <td colSpan="11">
                        <div className="order-details">
                          {loadingDetails ? (
                            <p>Đang tải chi tiết đơn hàng...</p>
                          ) : orderDetails.length > 0 ? (
                            <table className="order-details-table">
                              <thead>
                                <tr>
                                  <th>Ảnh bìa</th>
                                  <th>Tên sách</th>
                                  <th>Số lượng</th>
                                  <th>Tổng tiền</th>
                                </tr>
                              </thead>
                              <tbody>
                                {orderDetails.map((detail) => (
                                  <tr key={detail.orderDetailId}>
                                    <td>
                                      {detail.urlThumbnail ? (
                                        <img
                                          src={detail.urlThumbnail}
                                          alt={detail.bookName}
                                          className="order-detail-image"
                                        />
                                      ) : (
                                        'Không có ảnh'
                                      )}
                                    </td>
                                    <td>{detail.bookName}</td>
                                    <td>{detail.quantity}</td>
                                    <td>{detail.totalPrice.toLocaleString('vi-VN')} VNĐ</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p>Không có chi tiết đơn hàng!</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <div className="order-pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Trang trước
            </button>
            <span>
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Trang sau
            </button>
          </div>
        </>
      )}

      {showRejectModal && (
        <div className="order-modal">
          <div className="order-modal-content">
            <h3>Lý do từ chối đơn hàng</h3>
            <div className="order-reject-reason-container">
              <textarea
                className="order-reject-reason"
                value={rejectOrderData.cause}
                onChange={(e) =>
                  setRejectOrderData({
                    ...rejectOrderData,
                    cause: e.target.value.slice(0, 500),
                  })
                }
                placeholder="Nhập lý do từ chối đơn hàng (tối đa 500 ký tự)"
                rows="12"
                maxLength="500"
              />
              <span
                className={`order-reject-char-count ${
                  rejectOrderData.cause.length === 500 ? 'char-count-max' : ''
                }`}
              >
                {rejectOrderData.cause.length}/500
              </span>
            </div>
            <div className="order-modal-actions">
              <button
                className="order-modal-button order-modal-cancel"
                onClick={handleCloseRejectModal}
              >
                Hủy
              </button>
              <button
                className="order-modal-button order-modal-confirm"
                onClick={handleRejectOrder}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;