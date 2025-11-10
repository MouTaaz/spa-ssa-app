import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function MigrationRequired() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 bg-slate-800 border-slate-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            Database Migration Required
          </h1>

          <p className="text-slate-300 mb-6 leading-relaxed">
            The application has been updated to support multi-tenant
            architecture, but the database migration hasn't been applied yet.
            Please run the migration script in your Supabase SQL Editor to
            continue.
          </p>

          <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-400 mb-2">
              Migration file location:
            </p>
            <code className="text-xs text-slate-300 bg-slate-900 px-2 py-1 rounded">
              multi-tenant-migration.sql
            </code>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() =>
                window.open("https://supabase.com/dashboard", "_blank")
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Supabase Dashboard
            </Button>

            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Check Again
            </Button>
          </div>

          <div className="mt-8 text-xs text-slate-500">
            <p>
              After running the migration, refresh this page to continue using
              the application.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
