import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from '../../lib/api.js';

const initialState = {
  token: localStorage.getItem('token') || null,
  adminToken: localStorage.getItem('adminToken') || null,
  user: null,
  status: 'idle',
  error: null,
  lastSignupEmail: null,
  lastSignupOtpForDev: null
};

export const signup = createAsyncThunk('auth/signup', async ({ email, password, name }) => {
  const json = await apiRequest('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  return json;
});

export const verifySignup = createAsyncThunk('auth/verifySignup', async ({ email, otp }) => {
  const json = await apiRequest('/api/auth/verify-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  return json;
});

export const resendSignupOtp = createAsyncThunk('auth/resendSignupOtp', async ({ email }) => {
  const json = await apiRequest('/api/auth/resend-signup-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return json;
});

export const login = createAsyncThunk('auth/login', async ({ email, password }) => {
  const json = await apiRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return json;
});

export const adminLogin = createAsyncThunk('auth/adminLogin', async ({ email, password }) => {
  const json = await apiRequest('/api/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return json;
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  const json = await apiRequest('/api/auth/me');
  return json;
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async ({ email }) => {
  const json = await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return json;
});

export const completeProfile = createAsyncThunk('auth/completeProfile', async (formData) => {
  const json = await apiRequest('/api/auth/complete-profile', {
    method: 'POST',
    body: formData
  });
  return json;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.adminToken = null;
      state.user = null;
      state.error = null;
      state.status = 'idle';
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('user');
      } catch (e) {
        // ignore
      }
    },
    hydrateUserFromStorage(state) {
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        state.user = u;
      } catch (e) {
        state.user = null;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action) => {
        const token = action.payload?.data?.token || null;
        state.token = token;
        if (token) {
          try {
            localStorage.setItem('token', token);
            localStorage.removeItem('adminToken');
          } catch (e) {
            // ignore
          }
        }
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        const token = action.payload?.data?.token || null;
        state.adminToken = token;
        if (token) {
          try {
            localStorage.setItem('adminToken', token);
            localStorage.removeItem('token');
          } catch (e) {
            // ignore
          }
        }
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        const user = action.payload?.data?.user || null;
        state.user = user;
        try {
          if (user) localStorage.setItem('user', JSON.stringify(user));
        } catch (e) {
          // ignore
        }
      })
      .addCase(signup.fulfilled, (state, action) => {
        const email = action.payload?.data?.email || null;
        const otpForDev = action.payload?.data?.otpForDev || null;
        state.lastSignupEmail = email;
        state.lastSignupOtpForDev = otpForDev;
      })
      .addMatcher(
        (action) => action.type.startsWith('auth/') && action.type.endsWith('/pending'),
        (state) => {
          state.status = 'loading';
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('auth/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.status = 'failed';
          state.error = action.error?.message || 'Request failed';
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('auth/') && action.type.endsWith('/fulfilled'),
        (state) => {
          state.status = 'succeeded';
          state.error = null;
        }
      );
  }
});

export const { logout, hydrateUserFromStorage } = authSlice.actions;
export default authSlice.reducer;
