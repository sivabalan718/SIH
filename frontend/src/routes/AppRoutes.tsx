import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login.js';
import { Register } from '../pages/Register.js';
import { RegisterSuccess } from '../pages/RegisterSuccess.js';
import { CustomerLogin } from '../pages/CustomerLogin.js';
import { CustomerRegister } from '../pages/CustomerRegister.js';
import { CustomerProfilePage } from '../pages/CustomerProfilePage.js';
import { ProtectedRoute } from './ProtectedRoute.js';
import { ProtectedLayout } from '../components/layout/ProtectedLayout.js';
import { Dashboard } from '../pages/Dashboard.js';
import { Profile } from '../pages/Profile.js';
import { ProductList } from '../pages/ProductList.js';
import { ProductCreate } from '../pages/ProductCreate.js';
import { ProductDetail } from '../pages/ProductDetail.js';
import { Marketplace } from '../pages/Marketplace.js';
import { MarketplaceProductDetail } from '../pages/MarketplaceProductDetail.js';
import { CartPage } from '../pages/CartPage.js';
import { CheckoutPage } from '../pages/CheckoutPage.js';
import { OrderSuccessPage } from '../pages/OrderSuccessPage.js';
import { BuyerOrdersPage } from '../pages/BuyerOrdersPage.js';
import { ArtisanOrdersPage } from '../pages/ArtisanOrdersPage.js';
import { AnalyticsPage } from '../pages/AnalyticsPage.js';
import { useAuth } from '../contexts/AuthContext.js';
import { ShopLayout } from '../components/shop/ShopLayout.js';
import { NotificationsPage } from '../pages/NotificationsPage.js';
import { ShopHome } from '../pages/shop/ShopHome.js';
import { ShopDiscover } from '../pages/shop/ShopDiscover.js';
import { ShopProductPage } from '../pages/shop/ShopProductPage.js';
import { ShopAccount } from '../pages/shop/ShopAccount.js';
import { ShopAssistant } from '../pages/shop/ShopAssistant.js';
import { ShopCart } from '../pages/shop/ShopCart.js';
import { ShopCheckout } from '../pages/shop/ShopCheckout.js';
import { ShopOrders } from '../pages/shop/ShopOrders.js';
import { ShopOrderDetail } from '../pages/shop/ShopOrderDetail.js';
import { ShopOrderSuccess } from '../pages/shop/ShopOrderSuccess.js';

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public / Commerce Marketplace Routes */}
      <Route path="/marketplace" element={<ShopLayout />}>
        <Route index element={<ShopHome />} />
        <Route path="discover" element={<ShopDiscover />} />
        <Route path="product/:productId" element={<ShopProductPage />} />
        <Route path="account" element={<ShopAccount />} />
        <Route path="ai" element={<ShopAssistant />} />
        <Route path="cart" element={<ShopCart />} />
        <Route path="checkout" element={<ShopCheckout />} />
        <Route path="order-success/:orderId" element={<ShopOrderSuccess />} />
        <Route path="orders" element={<ShopOrders />} />
        <Route path="orders/:orderId" element={<ShopOrderDetail />} />
        <Route path="notifications" element={<NotificationsPage variant="shop" />} />
        <Route path="profile" element={<CustomerProfilePage />} />
      </Route>
      {/* Previous desktop gallery kept available */}
      <Route path="/marketplace/gallery" element={<Marketplace />} />
      <Route path="/marketplace/gallery/product/:productId" element={<MarketplaceProductDetail />} />
      <Route path="/marketplace/gallery/cart" element={<CartPage />} />
      <Route path="/marketplace/gallery/checkout" element={<CheckoutPage />} />
      <Route path="/marketplace/gallery/order-success/:orderId" element={<OrderSuccessPage />} />
      <Route path="/marketplace/gallery/orders" element={<BuyerOrdersPage />} />

      {/* Customer Dedicated Authentication Routes */}
      <Route
        path="/customer/login"
        element={user?.role === 'CUSTOMER' ? <Navigate to="/marketplace" replace /> : <CustomerLogin />}
      />
      <Route
        path="/customer/register"
        element={user?.role === 'CUSTOMER' ? <Navigate to="/marketplace" replace /> : <CustomerRegister />}
      />

      {/* Artisan Public Auth Routes */}
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'ARTISAN' ? '/artisan/dashboard' : '/marketplace'} replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to={user.role === 'ARTISAN' ? '/artisan/dashboard' : '/marketplace'} replace /> : <Register />}
      />
      <Route path="/register-success" element={<RegisterSuccess />} />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === 'ARTISAN' ? '/artisan/dashboard' : '/marketplace'} replace />
          ) : (
            // Signed-out users start at artisan registration (login and shop links are on that page)
            <Navigate to="/register" replace />
          )
        }
      />

      {/* Authenticated Artisan Routes */}
      <Route element={<ProtectedRoute requiredRole="ARTISAN" />}>
        <Route path="/artisan" element={<ProtectedLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductCreate />} />
          <Route path="products/:productId" element={<ProductDetail />} />
          <Route path="orders" element={<ArtisanOrdersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="notifications" element={<NotificationsPage variant="artisan" />} />
        </Route>
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
