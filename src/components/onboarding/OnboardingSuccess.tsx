"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Copy, ArrowRight, AlertCircle } from "lucide-react";

export function OnboardingSuccess({ onNext }: { onNext?: () => void }) {
  const navigate = useNavigate();
  const {
    currentBusiness,
    createBusiness,
    loading: businessLoading,
    error: businessError,
  } = useBusiness();
  const [copied, setCopied] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);

  // If no business exists, show business creation form
  if (!currentBusiness) {
    const handleCreateBusiness = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!businessName.trim()) return;

      setIsCreatingBusiness(true);
      try {
        await createBusiness({
          name: businessName.trim(),
          website: website.trim() || undefined,
        });
      } catch (error) {
        console.error("Failed to create business:", error);
      } finally {
        setIsCreatingBusiness(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Account Created Successfully!
            </h1>
            <p className="text-slate-600">
              Welcome to SSA Manager. Let's create your business to get started.
            </p>
          </div>

          <form onSubmit={handleCreateBusiness} className="space-y-4">
            {businessError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600">{businessError}</p>
              </div>
            )}

            <div>
              <Label htmlFor="business-name" className="text-sm font-medium">
                Business Name
              </Label>
              <p className="text-sm text-slate-600 mb-2">
                Enter the name of your business or service.
              </p>
              <Input
                id="business-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="My Business Name"
                required
                disabled={isCreatingBusiness}
              />
            </div>

            <div>
              <Label htmlFor="business-website" className="text-sm font-medium">
                Website URL (Optional)
              </Label>
              <p className="text-sm text-slate-600 mb-2">
                Enter your WordPress website URL for appointment integration.
              </p>
              <Input
                id="business-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                disabled={isCreatingBusiness}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                isCreatingBusiness || businessLoading || !businessName.trim()
              }
            >
              {isCreatingBusiness ? "Creating Business..." : "Create Business"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const webhookUrl = `https://your-supabase-project.supabase.co/functions/v1/process-appointment?webhook_secret=${currentBusiness.webhook_secret}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Business Created Successfully!
            </h1>
            <p className="text-slate-600">
              Welcome to SSA Manager, {currentBusiness.name}. Let's get you set
              up to receive appointments from your WordPress site.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="webhook-url" className="text-sm font-medium">
                Your Webhook URL
              </Label>
              <p className="text-sm text-slate-600 mb-2">
                Copy this URL to use in your WordPress SSA plugin configuration.
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
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Install the SSA WordPress plugin on your site</li>
                <li>2. Configure the plugin with your webhook URL above</li>
                <li>
                  3. Test the connection to ensure appointments flow through
                </li>
                <li>4. Start managing your appointments in SSA Manager!</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={onNext || (() => navigate("/onboarding/setup"))}
              >
                Setup WordPress Plugin
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/appointments")}
              >
                Skip Setup
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
