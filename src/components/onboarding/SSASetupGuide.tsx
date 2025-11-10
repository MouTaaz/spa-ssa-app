"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Copy,
  ArrowRight,
  ArrowLeft,
  Download,
} from "lucide-react";

export function SSASetupGuide({ onNext }: { onNext?: () => void }) {
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();
  const [currentStep, setCurrentStep] = useState(1);
  const [copied, setCopied] = useState(false);

  if (!currentBusiness) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-slate-600">Loading business information...</p>
        </Card>
      </div>
    );
  }

  const webhookUrl = `https://cuzwnsrtdnybwtuwaosr.supabase.co/functions/v1/ssa-webhook/${currentBusiness.webhook_secret}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const steps = [
    {
      title: "Go to WordPress Admin → Simply Schedule Appointments",
      content: (
        <div className="space-y-4">
          <p className="text-slate-600">
            Navigate to your WordPress admin dashboard and find the Simply
            Schedule Appointments plugin.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              Step 1: Access WordPress Admin
            </h4>
            <p className="text-sm text-blue-800 mb-3">
              Go to your WordPress site and log in to the admin dashboard.
            </p>
            <h4 className="font-semibold text-blue-900 mb-2">
              Step 2: Find SSA Plugin
            </h4>
            <p className="text-sm text-blue-800">
              Look for "Simply Schedule Appointments" in your admin menu.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Click Settings → Webhooks",
      content: (
        <div className="space-y-4">
          <p className="text-slate-600">
            In the SSA plugin, navigate to the Settings section and find the
            Webhooks tab.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">
              Navigation Steps
            </h4>
            <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
              <li>Click on "Settings" in the SSA menu</li>
              <li>Look for the "Webhooks" tab or section</li>
              <li>Click on Webhooks to open the configuration</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      title: "Paste your URL in the 'URLs' field",
      content: (
        <div className="space-y-4">
          <p className="text-slate-600">
            Copy your webhook URL and paste it into the URLs field in the SSA
            webhooks settings.
          </p>
          <div>
            <Label htmlFor="webhook-url" className="text-sm font-medium">
              Your Webhook URL
            </Label>
            <p className="text-sm text-slate-600 mb-2">
              Copy this URL and paste it in the SSA plugin settings.
            </p>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl)}
                className="shrink-0"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-2">Configuration</h4>
            <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
              <li>Find the "URLs" field in the webhooks settings</li>
              <li>Paste the webhook URL above into the field</li>
              <li>Make sure there are no extra spaces</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      title: "Save and create a test appointment",
      content: (
        <div className="space-y-4">
          <p className="text-slate-600">
            Save your webhook settings and create a test appointment to verify
            the connection.
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-2">Final Steps</h4>
            <ol className="text-sm text-purple-800 space-y-1 list-decimal list-inside">
              <li>Click "Save" or "Update" in the SSA settings</li>
              <li>Create a test appointment on your WordPress site</li>
              <li>Wait 1-2 minutes for the webhook to process</li>
              <li>Check if the appointment appears in SSA Manager</li>
            </ol>
          </div>
          <Button
            className="w-full"
            onClick={onNext || (() => navigate("/onboarding/verify"))}
          >
            I've done this - Check for appointments
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/onboarding-success")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Success
            </Button>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Connect Your WordPress Site
            </h1>
            <p className="text-slate-600">
              Follow these steps to connect your WordPress site to SSA Manager.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      index + 1 <= currentStep
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {index + 1 <= currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 ${
                        index + 1 < currentStep ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Step {currentStep}: {steps[currentStep - 1].title}
            </h2>
          </div>

          {/* Step Content */}
          <div className="mb-8">{steps[currentStep - 1].content}</div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            <Button
              onClick={() => {
                if (currentStep < steps.length) {
                  setCurrentStep(currentStep + 1);
                } else {
                  onNext?.() || navigate("/onboarding/verify");
                }
              }}
            >
              {currentStep === steps.length ? "Test Connection" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
