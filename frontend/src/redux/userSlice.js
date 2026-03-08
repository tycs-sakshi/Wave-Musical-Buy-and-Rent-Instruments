import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
    name: "User",
    initialState: {
        user: null
    },
    reducers: {
        //actions
        setUser: (state, action) => {
            state.user = action.payload
        },
        logout: (state) => {
            state.user = null
        }
    }
})

export const { setUser, logout } = userSlice.actions
export default userSlice.reducer