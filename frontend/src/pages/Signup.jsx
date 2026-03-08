import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axiosClient from "@/api/axiosClient";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitHandler = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const res = await axiosClient.post("/user/register", formData);
      toast.success(res.data.message || "Registration successful");
      navigate("/verify");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-amber-50 px-4">
      <Card className="w-full max-w-sm bg-white shadow-sm border border-amber-200 rounded-xl">
        <form onSubmit={submitHandler}>
          <CardHeader className="pb-2 border-b border-amber-100">
            <CardTitle className="text-2xl font-display font-bold text-slate-900">
              Create Account
            </CardTitle>
            <CardDescription className="text-slate-500">
              Register and verify your email to start shopping.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                {showPassword ? (
                  <EyeOff
                    onClick={() => setShowPassword(false)}
                    className="w-4 h-4 text-slate-500 absolute right-3 bottom-3 cursor-pointer"
                  />
                ) : (
                  <Eye
                    onClick={() => setShowPassword(true)}
                    className="w-4 h-4 text-slate-500 absolute right-3 bottom-3 cursor-pointer"
                  />
                )}
              </div>
            </div>
          </CardContent>
<br/>
          <CardFooter className="flex-col gap-3 pb-6">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Please wait...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-slate-900 hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Signup;
