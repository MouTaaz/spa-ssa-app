"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Mail, RefreshCw } from "lucide-react";

export function EmailVerificationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resendVerificationEmail, loading, error } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Get email from location state (passed from signup)
  const email = location.state?.email || "";

  useEffect(() => {
    // If no email in state, redirect to signup
    if (!email) {
      navigate("/signup");
    }
  }, [email, navigate]);

  const handleResendEmail = async () => {
    if (!email) return;

    setResendLoading(true);
    try {
      const result = await resendVerificationEmail(email);
      if (result.success) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err) {
      console.error("Failed to resend verification email:", err);
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/login");
  };

  if (!email) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <Mail className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-center mb-2">
              Verify Your Email
            </h1>
            <p className="text-slate-600">
              We've sent a verification email to:
            </p>
            <p className="text-lg font-semibold text-slate-900 mt-2">{email}</p>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {resendSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Mail className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-600">
                  Verification email sent successfully!
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                What happens next?
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check your email for the verification link</li>
                <li>• Click the link to verify your account</li>
                <li>• Sign in to complete your business setup</li>
                <li>• Set up your appointment management system</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full"
                disabled={resendLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    resendLoading ? "animate-spin" : ""
                  }`}
                />
                {resendLoading ? "Sending..." : "Resend Verification Email"}
              </Button>

              <Button onClick={handleGoToLogin} className="w-full">
                I've Verified My Email - Sign In
              </Button>
            </div>

            <p className="text-center text-sm text-slate-600">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
