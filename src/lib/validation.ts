import { z } from "zod";

export const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Full name is too long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  business_name: z.string().optional(),
  address: z.string().optional(),
  profilePicture: z.any().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
