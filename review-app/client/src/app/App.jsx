import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import SignupPage from '../pages/SignupPage.jsx';
import VerifySignupPage from '../pages/VerifySignupPage.jsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import CompleteProfilePage from '../pages/CompleteProfilePage.jsx';
import AdminLoginPage from '../pages/admin/AdminLoginPage.jsx';
import RatingsBrowsePage from '../pages/RatingsBrowsePage.jsx';
import StudentRatingsDashboardPage from '../pages/StudentRatingsDashboardPage.jsx';
import StudentEditReviewPage from '../pages/StudentEditReviewPage.jsx';
import AdminRatingsPage from '../pages/admin/AdminRatingsPage.jsx';
import AdminTermsPage from '../pages/admin/AdminTermsPage.jsx';
import AdminOfferingsPage from '../pages/admin/AdminOfferingsPage.jsx';
import AdminOfferingEditPage from '../pages/admin/AdminOfferingEditPage.jsx';
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx';
import AdminUserFormPage from '../pages/admin/AdminUserFormPage.jsx';
import AdminAddClassPage from '../pages/admin/AdminAddClassPage.jsx';
import StudentGiveReviewPage from '../pages/StudentGiveReviewPage.jsx';
import StudentGiveReviewFormPage from '../pages/StudentGiveReviewFormPage.jsx';
import RequireAuth from '../routes/RequireAuth.jsx';
import RequireAdmin from '../routes/RequireAdmin.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-signup" element={<VerifySignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/ratings" element={<RatingsBrowsePage />} />

        <Route element={<RequireAuth />}
        >
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/dashboard/ratings" element={<StudentRatingsDashboardPage />} />
          <Route path="/ratings/give" element={<StudentGiveReviewPage />} />
          <Route path="/ratings/give/:offeringId" element={<StudentGiveReviewFormPage />} />
          <Route path="/ratings/edit/:ratingId" element={<StudentEditReviewPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route element={<RequireAdmin />}
        >
          <Route path="/admin/ratings" element={<AdminRatingsPage />} />
          <Route path="/admin/terms" element={<AdminTermsPage />} />
          <Route path="/admin/offerings" element={<AdminOfferingsPage />} />
          <Route path="/admin/offerings/:id/edit" element={<AdminOfferingEditPage />} />
          <Route path="/admin/class/add" element={<AdminAddClassPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/new" element={<AdminUserFormPage />} />
          <Route path="/admin/users/:id/edit" element={<AdminUserFormPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
