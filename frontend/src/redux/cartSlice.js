import { createSlice } from "@reduxjs/toolkit";

// item types:
// - buy:  { type: 'buy', instrumentId, name, price, quantity, image, dealId? }
// - rent: { type: 'rent', instrumentId, name, rentPricePerDay, startDate, endDate, days, totalRent, deposit, image, dealId? }

const initialState = {
  items: [],
};

const findItemIndex = (items, payload) =>
  items.findIndex(
    (item) =>
      item.type === payload.type &&
      item.instrumentId === payload.instrumentId &&
      (item.type === "buy" ||
        (item.type === "rent" &&
          item.startDate === payload.startDate &&
          item.endDate === payload.endDate))
  );

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const index = findItemIndex(state.items, action.payload);
      if (index >= 0) {
        // increase quantity for buy items
        if (state.items[index].type === "buy") {
          state.items[index].quantity += action.payload.quantity || 1;
        }
      } else {
        state.items.push(action.payload);
      }
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter((item, idx) => idx !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    },
    updateQuantity: (state, action) => {
      const { index, quantity } = action.payload;
      if (state.items[index] && quantity > 0) {
        state.items[index].quantity = quantity;
      }
    },
  },
});

export const { addToCart, removeFromCart, clearCart, updateQuantity } =
  cartSlice.actions;
export default cartSlice.reducer;

