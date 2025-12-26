import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from '../../lib/api.js';

const initialState = {
  items: [],
  total: 0,
  page: 1,
  limit: 25,
  aggregates: { avgOverall: 0, avgMarks: 0, count: 0 },
  status: 'idle',
  error: null,
  updateStatus: 'idle',
  updateError: null
};

export const listRatings = createAsyncThunk('ratings/list', async (params = {}) => {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    usp.set(k, String(v));
  });
  const qs = usp.toString() ? '?' + usp.toString() : '';
  const json = await apiRequest('/api/ratings' + qs);
  return json;
});

export const adminUpdateRating = createAsyncThunk('ratings/adminUpdate', async ({ id, patch }) => {
  const json = await apiRequest(`/api/ratings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch || {})
  });
  return { json, id, patch };
});

const ratingsSlice = createSlice({
  name: 'ratings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(listRatings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(listRatings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error?.message || 'Request failed';
      })
      .addCase(listRatings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const data = action.payload?.data || {};
        state.items = data.items || [];
        state.total = data.total || 0;
        state.page = data.page || 1;
        state.limit = data.limit || 25;
        state.aggregates = data.aggregates || { avgOverall: 0, avgMarks: 0, count: 0 };
      })
      .addCase(adminUpdateRating.pending, (state) => {
        state.updateStatus = 'loading';
        state.updateError = null;
      })
      .addCase(adminUpdateRating.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updateError = action.error?.message || 'Update failed';
      })
      .addCase(adminUpdateRating.fulfilled, (state) => {
        state.updateStatus = 'succeeded';
        state.updateError = null;
      });
  }
});

export default ratingsSlice.reducer;
