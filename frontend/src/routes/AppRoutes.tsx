import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login.js';
import { Register } from '../pages/Register.js';
import { RegisterSuccess } from '../pages/RegisterSuccess.js';
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

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public / Commerce Marketplace Routes */}
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/marketplace/product/:productId" element={<MarketplaceProductDetail />} />
      <Route path="/marketplace/cart" element={<CartPage />} />
      <Route path="/marketplace/checkout" element={<CheckoutPage />} />
      <Route path="/marketplace/order-success/:orderId" element={<OrderSuccessPage />} />
      <Route path="/marketplace/orders" element={<BuyerOrdersPage />} />

      {/* Public Auth Routes */}
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
            <Navigate to="/marketplace" replace />
          )
        }
      />

      {/* Authenticated Artisan Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/artisan" element={<ProtectedLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductCreate />} />
          <Route path="products/:productId" element={<ProductDetail />} />

          {/* Phase 7: Order Workspace */}
          <Route path="orders" element={<ArtisanOrdersPage />} />

          {/* Phase 8: Business Intelligence Workspace */}
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<Navigate to="/marketplace" replace />} />
    </Routes>
  );
};
