import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, BarChart3, Bell, Smartphone } from "lucide-react";

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome back, {user.full_name}!
            </h1>
            <p className="text-xl text-slate-300">
              Manage your auto service appointments with ease
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow bg-slate-800 border-slate-700">
              <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2 text-white">Appointments</h3>
              <p className="text-sm text-slate-300">
                View and manage all your scheduled appointments
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow bg-slate-800 border-slate-700">
              <BarChart3 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2 text-white">Analytics</h3>
              <p className="text-sm text-slate-300">
                Track your business metrics and performance
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow bg-slate-800 border-slate-700">
              <Bell className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2 text-white">Notifications</h3>
              <p className="text-sm text-slate-300">
                Get real-time updates on appointment changes
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow bg-slate-800 border-slate-700">
              <Smartphone className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2 text-white">Mobile App</h3>
              <p className="text-sm text-slate-300">
                Install as a standalone app on your device
              </p>
            </Card>
          </div>

          <div className="text-center">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate("/appointments")}
              className="mr-4"
            >
              Go to Appointments
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/profile")}
            >
              Edit Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">SSA Manager</h1>
          <p className="text-xl text-slate-300 mb-8">
            Unified appointment management platform for auto service scheduling
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              variant="default"
              className=""
              size="lg"
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
            <Button
              size="lg"
              className=""
              variant="outline"
              onClick={() => navigate("/signup")}
            >
              Create Account
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <Card className="p-8 bg-slate-800 border-slate-700">
            <Calendar className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">
              Real-time Sync
            </h3>
            <p className="text-slate-300">
              Automatic synchronization with SSA platform webhooks
            </p>
          </Card>

          <Card className="p-8 bg-slate-800 border-slate-700">
            <Smartphone className="w-12 h-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">Mobile Ready</h3>
            <p className="text-slate-300">
              Install as a PWA for offline access and push notifications
            </p>
          </Card>

          <Card className="p-8 bg-slate-800 border-slate-700">
            <Bell className="w-12 h-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">
              Smart Notifications
            </h3>
            <p className="text-slate-300">
              Get instant alerts for appointment changes and updates
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
