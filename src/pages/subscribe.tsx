import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useBusiness } from "@/hooks/useBusiness";
import { useSubscription } from "@/hooks/useSubscription";

export function SubscribePage() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();
  const { subscriptionPlans, loading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    // TODO: Implement subscription logic
    alert(`Subscription to plan ${planId} would be processed here`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Choose Your Plan
            </h1>
            <p className="text-slate-600">
              Your business "{currentBusiness?.name}" needs an active
              subscription to continue.
            </p>
          </div>

          {/* Subscription Status */}
          {currentBusiness && (
            <Card className="p-6 mb-8 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">
                    Subscription Required
                  </h3>
                  <p className="text-amber-800">
                    Current status:{" "}
                    <Badge variant="secondary">
                      {currentBusiness.subscription_status}
                    </Badge>
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`p-6 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? "ring-2 ring-blue-500 border-blue-500"
                    : "hover:shadow-lg"
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    ${plan.price_monthly}
                    <span className="text-sm font-normal text-slate-500">
                      /month
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm">{plan.description}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Appointments</span>
                    <span className="font-semibold">
                      {plan.max_appointments_per_month === -1
                        ? "Unlimited"
                        : plan.max_appointments_per_month}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Team Members</span>
                    <span className="font-semibold">
                      {plan.max_team_members === -1
                        ? "Unlimited"
                        : plan.max_team_members}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Services</span>
                    <span className="font-semibold">
                      {plan.max_services === -1
                        ? "Unlimited"
                        : plan.max_services}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Customers</span>
                    <span className="font-semibold">
                      {plan.max_customers === -1
                        ? "Unlimited"
                        : plan.max_customers}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {plan.features &&
                    Object.entries(plan.features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle
                          className={`w-4 h-4 ${
                            enabled ? "text-green-500" : "text-slate-300"
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            enabled ? "text-slate-700" : "text-slate-400"
                          }`}
                        >
                          {feature
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                    ))}
                </div>

                <Button
                  className="w-full"
                  variant={selectedPlan === plan.id ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubscribe(plan.id);
                  }}
                >
                  {selectedPlan === plan.id ? "Selected" : "Select Plan"}
                </Button>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-slate-500 text-sm">
            <p>Need help choosing a plan? Contact our support team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
