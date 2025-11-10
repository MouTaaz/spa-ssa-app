import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "../stores/authStore";
import { profileSchema } from "../lib/validation";
import {
  Upload,
  User,
  X,
  Mail,
  Phone,
  MapPin,
  Building,
  Save,
  Loader2,
  Camera,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export const ProfileSettings = ({ onBack }) => {
  const { user, profile, updateProfile, isLoading } = useAuthStore();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      email: user?.email || "",
      phone: profile?.phone || "",
      business_name: profile?.business_name || "",
      address: profile?.address || "",
      bio: profile?.bio || "",
    },
  });

  const profilePicture = watch("profilePicture");

  useEffect(() => {
    if (profile?.avatar_url) {
      setPreviewUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (profilePicture?.[0]) {
      const file = profilePicture[0];
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [profilePicture]);

  const removeProfilePicture = () => {
    setValue("profilePicture", null);
    setPreviewUrl(profile?.avatar_url || null);
  };

  const onSubmit = async (data) => {
    setIsUploading(true);
    const profilePictureFile = data.profilePicture?.[0] || null;
    await updateProfile(
      {
        full_name: data.full_name,
        phone: data.phone,
        business_name: data.business_name,
        address: data.address,
        bio: data.bio,
      },
      profilePictureFile
    );
    setIsUploading(false);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-linear-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 mobile-smooth"
    >
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center space-x-4 mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 mobile-tap-highlight"
          >
            <svg
              className="h-5 w-5 text-slate-600 dark:text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Profile Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage your account information
            </p>
          </div>
        </motion.div>

        <Card className="bg-white dark:bg-slate-800 border-0 shadow-xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex justify-center"
            >
              <div className="w-16 h-16 bg-linear-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="h-8 w-8 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold bg-linear-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Profile Information
            </CardTitle>
            <CardDescription className="text-base text-slate-600 dark:text-slate-400">
              Update your personal and business details
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Profile Picture Upload */}
              <motion.div variants={itemVariants} className="space-y-4">
                <Label
                  htmlFor="profilePicture"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Profile Picture
                </Label>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                >
                  <div className="flex justify-center sm:justify-start">
                    <div className="relative">
                      {previewUrl ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="relative group"
                        >
                          <img
                            src={previewUrl}
                            alt="Profile preview"
                            className="w-20 h-20 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                          />
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={removeProfilePicture}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors mobile-tap-highlight"
                          >
                            <X className="h-3 w-3" />
                          </motion.button>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-200 flex items-center justify-center">
                            <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="w-20 h-20 rounded-full linear-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 flex items-center justify-center border-4 border-dashed border-slate-400 dark:border-slate-500"
                        >
                          <User className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <Input
                      id="profilePicture"
                      type="file"
                      accept="image/*"
                      {...register("profilePicture")}
                      disabled={isSubmitting}
                      className="hidden"
                    />
                    <Label
                      htmlFor="profilePicture"
                      className="cursor-pointer flex items-center justify-center sm:justify-start space-x-2 bg-white dark:bg-slate-600 border-2 border-dashed border-slate-300 dark:border-slate-500 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-sm"
                    >
                      <Upload className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Upload new photo
                      </span>
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Recommended: Square image, at least 200x200 pixels
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Personal Information */}
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="fullName"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Full Name *
                    </Label>
                    <motion.div
                      whileFocus={{ scale: 1.02 }}
                      className="relative"
                    >
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="fullName"
                        {...register("fullName")}
                        placeholder="Enter your full name"
                        disabled={isSubmitting}
                        className="pl-10 py-2 h-11 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                      />
                    </motion.div>
                    <AnimatePresence>
                      {errors.fullName && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-red-500 font-medium mt-1"
                        >
                          {errors.fullName.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Email Address
                    </Label>
                    <motion.div
                      whileFocus={{ scale: 1.02 }}
                      className="relative"
                    >
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        disabled
                        className="pl-10 py-2 h-11 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      />
                    </motion.div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Phone Number
                  </Label>
                  <motion.div whileFocus={{ scale: 1.02 }} className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone")}
                      placeholder="Enter your phone number"
                      disabled={isSubmitting}
                      className="pl-10 py-2 h-11 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                    />
                  </motion.div>
                  <AnimatePresence>
                    {errors.phone && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-red-500 font-medium mt-1"
                      >
                        {errors.phone.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Business Information */}
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                  Business Information
                </h3>

                {/* Business Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="businessName"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Business Name
                  </Label>
                  <motion.div whileFocus={{ scale: 1.02 }} className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="businessName"
                      {...register("businessName")}
                      placeholder="Enter your business name"
                      disabled={isSubmitting}
                      className="pl-10 py-2 h-11 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                    />
                  </motion.div>
                  <AnimatePresence>
                    {errors.businessName && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-red-500 font-medium mt-1"
                      >
                        {errors.businessName.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label
                    htmlFor="address"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Business Address
                  </Label>
                  <motion.div whileFocus={{ scale: 1.02 }} className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Textarea
                      id="address"
                      {...register("address")}
                      placeholder="Enter your business address"
                      disabled={isSubmitting}
                      rows={3}
                      className="pl-10 py-2 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 focus:border-blue-500 focus:ring-blue-500 transition-colors resize-none"
                    />
                  </motion.div>
                  <AnimatePresence>
                    {errors.address && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-red-500 font-medium mt-1"
                      >
                        {errors.address.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label
                    htmlFor="bio"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Bio / Description
                  </Label>
                  <Textarea
                    id="bio"
                    {...register("bio")}
                    placeholder="Tell customers about your business..."
                    disabled={isSubmitting}
                    rows={4}
                    className="bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  />
                  <AnimatePresence>
                    {errors.bio && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-red-500 font-medium mt-1"
                      >
                        {errors.bio.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.div
                variants={itemVariants}
                className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700"
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onBack}
                  disabled={isSubmitting}
                  className="px-6 py-3 text-base font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all duration-200 disabled:opacity-50 mobile-tap-highlight"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{
                    scale: 1.02,
                    boxShadow:
                      "0 20px 25px -5px rgba(59, 130, 246, 0.3), 0 10px 10px -5px rgba(59, 130, 246, 0.1)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting || isUploading}
                  className="px-6 py-3 text-base font-semibold bg-linear-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mobile-tap-highlight"
                >
                  {isSubmitting || isUploading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center space-x-2"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Saving...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </motion.div>
                  )}
                </motion.button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};
