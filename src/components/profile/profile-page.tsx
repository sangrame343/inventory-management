"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  User2,
  Mail,
  Phone,
  Shield,
  Building2,
  Save,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  BadgeCheck,
  Crown,
  UserCog,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateProfile, updatePassword } from "@/app/actions/profile-actions";
import { cn } from "@/lib/utils";

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  image: string | null;
  isSuperAdmin: boolean;
  status: string;
  emailVerified: Date | null;
  companyRoles: {
    role: string;
    company: {
      id: string;
      name: string;
    };
  }[];
}

interface ProfilePageProps {
  profile: ProfileData;
}

export function ProfilePage({ profile }: ProfilePageProps) {
  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-foreground/10 to-foreground/[0.03] border border-border/60 flex items-center justify-center backdrop-blur-sm">
            <User2 className="size-8 text-foreground/60" />
          </div>
          <span
            className={cn(
              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-background",
              profile.status === "ACTIVE"
                ? "bg-emerald-500"
                : profile.status === "PENDING"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-red-500"
            )}
          />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            My Profile
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {profile.isSuperAdmin && (
              <Badge variant="default" className="gap-1 text-[10px] font-bold uppercase tracking-wider">
                <Crown size={10} /> Super Admin
              </Badge>
            )}
            {profile.companyRoles.map((cr) => (
              <Badge
                key={cr.company.id}
                variant="secondary"
                className="gap-1 text-[10px] font-semibold"
              >
                {cr.role === "ADMIN" ? (
                  <UserCog size={10} />
                ) : cr.role === "SUPER_ADMIN" ? (
                  <Shield size={10} />
                ) : (
                  <BadgeCheck size={10} />
                )}
                {cr.role} — {cr.company.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Form + Password Form */}
      <div className="grid grid-cols-1 gap-8">
        <ProfileForm profile={profile} />
        <PasswordForm />
      </div>
    </div>
  );
}

/* ─────────────────────── Profile Info Form ─────────────────────── */

function ProfileForm({ profile }: { profile: ProfileData }) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      name: profile.name || "",
      email: profile.email || "",
      mobile: profile.mobile || "",
    },
  });

  const isDirty = form.formState.isDirty;

  async function onSubmit(data: { name: string; email: string; mobile: string }) {
    setIsLoading(true);
    try {
      const result = await updateProfile({
        name: data.name,
        email: data.email,
        mobile: data.mobile || null,
      });

      if (result.error) {
        toast.error("Update Failed", { description: result.error });
      } else {
        toast.success("Profile Updated", {
          description: "Your profile information has been saved successfully.",
        });
        form.reset(data); // Reset dirty state with new values
      }
    } catch (error: any) {
      toast.error("Error", { description: "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card className="rounded-2xl border-border/50 shadow-lg shadow-primary/5 bg-card overflow-hidden">
        <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
          <div className="size-11 rounded-xl bg-foreground/[0.06] flex items-center justify-center mb-3">
            <User2 className="text-foreground/60 size-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your name, email, and contact details.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User2 size={12} /> Full Name
              </Label>
              <Input
                {...form.register("name", { required: "Name is required" })}
                placeholder="Your full name"
                className="h-11 rounded-xl bg-muted/30 border-border/50 font-medium"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail size={12} /> Email Address
              </Label>
              <Input
                {...form.register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email address",
                  },
                })}
                type="email"
                placeholder="you@example.com"
                className="h-11 rounded-xl bg-muted/30 border-border/50 font-medium"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone size={12} /> Mobile Number
              </Label>
              <Input
                {...form.register("mobile")}
                placeholder="+91 XXXXX XXXXX"
                className="h-11 rounded-xl bg-muted/30 border-border/50 font-medium"
              />
            </div>

            {/* Account Status (read-only) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield size={12} /> Account Status
              </Label>
              <div className="h-11 rounded-xl bg-muted/20 border border-border/30 px-4 flex items-center gap-2">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    profile.status === "ACTIVE"
                      ? "bg-emerald-500"
                      : profile.status === "PENDING"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  )}
                />
                <span className="text-sm font-medium text-foreground/80">
                  {profile.status}
                </span>
              </div>
            </div>
          </div>

          {/* Company Roles (read-only display) */}
          {profile.companyRoles.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 size={12} /> Company Roles
              </Label>
              <div className="flex flex-wrap gap-2">
                {profile.companyRoles.map((cr) => (
                  <div
                    key={cr.company.id}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/30 border border-border/40 text-sm"
                  >
                    <Building2 size={14} className="text-muted-foreground/60" />
                    <span className="font-medium">{cr.company.name}</span>
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase ml-1">
                      {cr.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-6 bg-muted/20 border-t border-border/40 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl h-10 px-5 font-semibold text-xs"
            onClick={() => form.reset()}
            disabled={!isDirty || isLoading}
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Reset
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || isLoading}
            className="rounded-xl h-10 px-6 font-bold shadow-md shadow-primary/10 text-xs"
          >
            {isLoading ? (
              "Saving..."
            ) : (
              <>
                <Save className="mr-1.5 size-3.5" /> Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

/* ─────────────────────── Password Change Form ─────────────────────── */

function PasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = form.watch("newPassword");

  // Password strength indicators
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const strengthScore = Object.values(checks).filter(Boolean).length;

  async function onSubmit(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const result = await updatePassword(data);

      if (result.error) {
        toast.error("Password Update Failed", { description: result.error });
      } else {
        toast.success("Password Changed", {
          description: "Your password has been updated successfully.",
        });
        form.reset();
      }
    } catch (error: any) {
      toast.error("Error", { description: "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card className="rounded-2xl border-border/50 shadow-lg shadow-primary/5 bg-card overflow-hidden">
        <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
          <div className="size-11 rounded-xl bg-foreground/[0.06] flex items-center justify-center mb-3">
            <Lock className="text-foreground/60 size-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Password */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lock size={12} /> Current Password
              </Label>
              <div className="relative">
                <Input
                  {...form.register("currentPassword", {
                    required: "Current password is required",
                  })}
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter your current password"
                  className="h-11 rounded-xl bg-muted/30 border-border/50 font-medium pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lock size={12} /> New Password
              </Label>
              <div className="relative">
                <Input
                  {...form.register("newPassword", {
                    required: "New password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  className="h-11 rounded-xl bg-muted/30 border-border/50 font-medium pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lock size={12} /> Confirm Password
              </Label>
              <div className="relative">
                <Input
                  {...form.register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) =>
                      value === form.getValues("newPassword") ||
                      "Passwords do not match",
                  })}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  className="h-11 rounded-xl bg-muted/30 border-border/50 font-medium pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Strength
                </span>
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all duration-300",
                        strengthScore >= level
                          ? strengthScore <= 1
                            ? "bg-red-500"
                            : strengthScore <= 2
                              ? "bg-amber-500"
                              : strengthScore <= 3
                                ? "bg-yellow-500"
                                : "bg-emerald-500"
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    strengthScore <= 1
                      ? "text-red-500"
                      : strengthScore <= 2
                        ? "text-amber-500"
                        : strengthScore <= 3
                          ? "text-yellow-500"
                          : "text-emerald-500"
                  )}
                >
                  {strengthScore <= 1
                    ? "Weak"
                    : strengthScore <= 2
                      ? "Fair"
                      : strengthScore <= 3
                        ? "Good"
                        : "Strong"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "length", label: "8+ characters" },
                  { key: "uppercase", label: "Uppercase letter" },
                  { key: "lowercase", label: "Lowercase letter" },
                  { key: "number", label: "Number" },
                ].map((check) => (
                  <div
                    key={check.key}
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-colors",
                      checks[check.key as keyof typeof checks]
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all",
                        checks[check.key as keyof typeof checks]
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted"
                      )}
                    >
                      {checks[check.key as keyof typeof checks] ? "✓" : ""}
                    </div>
                    {check.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-6 bg-muted/20 border-t border-border/40 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl h-10 px-5 font-semibold text-xs"
            onClick={() => form.reset()}
            disabled={isLoading}
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Clear
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="rounded-xl h-10 px-6 font-bold shadow-md shadow-primary/10 text-xs"
          >
            {isLoading ? (
              "Updating..."
            ) : (
              <>
                <Lock className="mr-1.5 size-3.5" /> Update Password
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
