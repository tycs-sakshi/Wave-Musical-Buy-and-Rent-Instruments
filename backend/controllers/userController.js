import { User } from "../models/userModel.js";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { verifyEmail } from "../emailVerify/verifyEmail.js";
import { Session } from "../models/sessionModel.js";
import { sendOTPMail } from "../emailVerify/sendOTPMail.js";
export const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            })
        }
        const user = await User.findOne({ email })
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'User Already Exists'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword
        })

        const token = jwt.sign({ id: newUser._id }, process.env.SECRET_KEY, { expiresIn: '10m' })
        await verifyEmail(token, email) //send email here
        newUser.token = token
        await newUser.save()
        return res.status(201).json({
            success: true,
            message: 'User Registered Successfully!!',
            user: newUser
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })

    }
}

export const verify = async (req, res) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            return res.status(400).json({
                success: false,
                message: 'Authorization is missing or Invalid'
            })

        }
        const token = authHeader.split(" ")[1] //Bearer (token)
        let decoded
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY)

        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(400).json({
                    success: false,
                    message: "The registration token has expired"
                })
            }
            return res.status(400).json({
                success: false,
                message: "Token Verification Failed"
            })

        }
        const user = await User.findById(decoded.id)
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User Not Found'
            })
        }
        user.token = null
        user.isVerified = true
        await user.save()
        return res.status(200).json({
            success: true,
            message: 'Email verified Successfully'
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const reVerify = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User Not Found'
            })
        }
        const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: '10m' })
        await verifyEmail(token, email) //send email here
        user.token = token
        await user.save()
        return res.status(200).json({
            success: true,
            message: 'Email send again successfully!!',
            token: user.token
        })


    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message

        })
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All Fields Are Required'
            })
        }
        const existingUser = await User.findOne({ email })
        if (!existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User not exists'
            })
        }
        const isPasswordValid = await bcrypt.compare(password, existingUser.password)
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Credentials'
            })
        }
        if (existingUser.isVerified === false) {
            return res.status(400).json({
                success: false,
                message: 'Verify user account then login'
            })
        }
        // Generate Token
        const accessToken = jwt.sign({ id: existingUser.id }, process.env.SECRET_KEY, { expiresIn: '10d' })
        const refreshToken = jwt.sign({ id: existingUser.id }, process.env.SECRET_KEY, { expiresIn: '30d' })

        existingUser.isLoggedIn = true
        await existingUser.save()


        //Check For Existing Session and delete it
        const existingSession = await Session.findOne({ userId: existingUser._id })
        if (existingSession) {
            await Session.deleteOne({ userId: existingUser._id })
        }
        // create new session
        await Session.create({ userId: existingUser._id })
        return res.status(200).json({
            success: true,
            message: `Welcome Back ${existingUser.firstName}`,
            user: existingUser,
            accessToken,
            refreshToken
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message

        })
    }
}

export const logout = async (req, res) => {
    try {
        const userId = req.id
        await Session.deleteMany({ userId: userId })
        await User.findByIdAndUpdate(userId, { isLoggedIn: false })
        return res.status(200).json({
            success: true,
            message: 'User logged out successfully'
        })
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            })
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) //10 min
        user.otp = otp
        user.otpExpiry = otpExpiry

        await user.save()
        await sendOTPMail(otp, email)
        return res.status(200).json({
            success: true,
            message: 'Otp Send to email successfully'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
export const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const { email } = req.params;
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is required'
            })
        }
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User Not Found'
            })
        }
        if (!user.otp || !user.otpExpiry) {
            return res.status(400).json({
                success: false,
                message: 'Otp is not generated or already verified'
            })
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Otp has Expired. Please request new one'
            })
        }
        if (otp !== user.otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is invalid'
            })
        }
        user.otp = null
        user.otpExpiry = null
        await user.save()
        return res.status(200).json({
            success: true,
            message: 'OTP verified Successfully!'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }

}
export const changePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const { email } = req.params;
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User Not Found'
            })
        }
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            })
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'password do not match'
            })
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        await user.save()
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }

}
export const allUser = async (_, res) => {
    try {
        const users = await User.find().select("-password -otp -otpExpiry -token")
        return res.status(200).json({
            success: true,
            users
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
export const getUserById = async (req, res) => {
    try {
        const { userId } = req.params; //etract userId from request params
        const user=await User.findById(userId).select("-password -otp -otpExpiry -token")
        if(!user){
            return res.status(404).json({
                success:false,
                message:'User not found'
            })
        }
        res.status(200).json({
            success:true,
            user
        })
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export const updateProfile = async (req, res) => {
    try {
        const userId = req.id;
        const allowedFields = [
            "firstName",
            "lastName",
            "profilePic",
            "address",
            "city",
            "zipCode",
            "phoneNo",
        ];
        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(userId, updates, {
            new: true,
        }).select("-password -otp -otpExpiry -token");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
