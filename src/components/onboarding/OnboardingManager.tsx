"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingSuccess } from "./OnboardingSuccess";
import { SSASetupGuide } from "./SSASetupGuide";
import { ConnectionVerifier } from "./ConnectionVerifier";
import { PushNotificationSetup } from "./PushNotificationSetup";

export function OnboardingManager() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<
    "success" | "guide" | "push" | "verify"
  >("success");

  const handleNext = (step: "success" | "guide" | "push" | "verify") => {
    setCurrentStep(step);
  };

  const handleComplete = () => {
    navigate("/dashboard");
  };

  if (currentStep === "success") {
    return <OnboardingSuccess onNext={() => handleNext("guide")} />;
  }

  if (currentStep === "guide") {
    return <SSASetupGuide onNext={() => handleNext("push")} />;
  }

  if (currentStep === "push") {
    return <PushNotificationSetup onNext={() => handleNext("verify")} />;
  }

  if (currentStep === "verify") {
    return <ConnectionVerifier onComplete={handleComplete} />;
  }

  return null;
}
