"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Building,
  Mail,
  User,
  X,
  KeyRound,
} from "lucide-react";
import { AdminLayout } from "@/components/shell/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
  user?: {
    username: string;
    role: string;
  } | null;
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  // Add Employee Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDept, setFormDept] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees?all=true");
      if (!res.ok) throw new Error("Failed to load employees");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch {
      setToastMessage({ text: "Failed to load employee directory.", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formEmail.trim() || !formDept.trim()) {
      setFormError("All fields are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          department: formDept.trim(),
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create employee.");
        setIsSubmitting(false);
        return;
      }

      setToastMessage({
        text: `Employee ${data.employee.name} added. Host login created (${data.loginCreated?.username || data.employee.email}).`,
        type: "success",
      });

      setIsAddOpen(false);
      setFormName("");
      setFormEmail("");
      setFormDept("");
      fetchEmployees();
    } catch {
      setFormError("Server error adding employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout companyName="Apex Technologies" activeSection="HOSTS">
      <div className="space-y-6">
        {toastMessage && (
          <Toast
            type={toastMessage.type}
            message={toastMessage.text}
            onDismiss={() => setToastMessage(null)}
          />
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Employee Directory
            </h1>
            <p className="text-sm text-ink-muted mt-0.5">
              Host employees authorized to receive and verify visitors at company gates.
            </p>
          </div>

          <Button
            size="md"
            variant="primary"
            onClick={() => {
              setFormName("");
              setFormEmail("");
              setFormDept("");
              setFormError(null);
              setIsAddOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Employee
          </Button>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or department..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink placeholder:text-ink-subtle"
            />
          </div>
        </Card>

        {/* Employees List */}
        {loading ? (
          <div className="text-center py-20 space-y-3">
            <Spinner size="lg" className="text-accent" />
            <p className="text-sm text-ink-muted">Loading employee directory...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            title="No employees found"
            description={
              search ? "No employees match your search query." : "No employees registered in the system."
            }
          />
        ) : (
          <div className="bg-surface border border-border rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-border text-xs font-bold uppercase text-ink-subtle">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Host Sign-In</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-ink">{emp.name}</div>
                      <div className="text-xs text-ink-muted font-mono">{emp.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-ink font-medium">
                      {emp.department}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {emp.email}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {emp.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Employee Modal (with Login Account Creation) */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-lg font-bold text-ink">Add Employee & Create Login</h3>
                  <p className="text-xs text-ink-subtle mt-0.5">
                    Creates host employee profile and sign-in credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-ink-subtle hover:text-ink p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-danger-bg border border-danger-border text-danger text-xs rounded">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />

                <Input
                  label="Company Email (Username)"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. rahul.sharma@example.com"
                />

                <Input
                  label="Department"
                  type="text"
                  required
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  placeholder="e.g. Human Resources, Finance, IT"
                />

                <div className="p-3 rounded bg-slate-50 border border-border text-xs space-y-1">
                  <div className="font-semibold text-ink flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-accent" />
                    <span>Host Login Account</span>
                  </div>
                  <p className="text-ink-muted">
                    Username: <span className="font-mono text-ink">{formEmail || "employee email"}</span>
                  </p>
                  <p className="text-ink-muted">
                    Initial Password: <span className="font-mono text-ink">GatePass2026!</span>
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                  >
                    Create Employee & Login
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
