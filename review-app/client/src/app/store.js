import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.js';
import ratingsReducer from '../features/ratings/ratingsSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ratings: ratingsReducer
  }
});
