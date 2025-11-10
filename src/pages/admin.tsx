import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Business } from "@/lib/store";

export function AdminPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Failed to load businesses:", error);
      alert("Failed to load businesses");
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async () => {
    if (!selectedBusiness || !newStatus) {
      alert("Please select a business and status");
      return;
    }

    try {
      const { error } = await supabase
        .from("businesses")
        .update({ subscription_status: newStatus })
        .eq("id", selectedBusiness);

      if (error) throw error;

      alert("Subscription status updated successfully");
      loadBusinesses();
      setSelectedBusiness("");
      setNewStatus("");
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update subscription status");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive",
      trial: "outline",
    };

    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">
            Admin Panel - Business Management
          </h1>

          {/* Update Status Form */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Update Subscription Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="business-select">Select Business</Label>
                <Select
                  value={selectedBusiness}
                  onValueChange={setSelectedBusiness}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-select">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={updateSubscriptionStatus} className="w-full">
                  Update Status
                </Button>
              </div>
            </div>
          </Card>

          {/* Businesses Table */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">All Businesses</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading businesses...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Owner ID</TableHead>
                      <TableHead>Subscription Status</TableHead>
                      <TableHead>Subscription Tier</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses.map((business) => (
                      <TableRow key={business.id}>
                        <TableCell className="font-medium">
                          {business.name}
                        </TableCell>
                        <TableCell>{business.email || "N/A"}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {business.owner_id}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(
                            business.subscription_status || "inactive"
                          )}
                        </TableCell>
                        <TableCell>
                          {business.subscription_tier || "free"}
                        </TableCell>
                        <TableCell>
                          {new Date(business.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
