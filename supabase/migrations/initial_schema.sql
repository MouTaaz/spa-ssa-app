-- Migration: Initial Database Schema for SPA-SSA App
-- Description: Creates all necessary tables for the appointment scheduling application
-- Date: 2024

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (depends on auth.users)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  business_name text,
  email text,
  phone text,
  avatar_url text,
  website text,
  address text,
  created_at timestamp with time zone DEFAULT now(),
