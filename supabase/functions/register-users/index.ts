/// <reference lib="deno.unstable" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dimesonly.world',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
const validateEmail = (email)=>{
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
const validatePassword = (password)=>{
  return password.length >= 6;
};
const validateRequired = (data)=>{
  const errors = [];
  const requiredFields = [
    'firstName',
    'lastName',
    'username',
    'email',
    'password',
    'mobileNumber',
    'address',
    'city',
    'state',
    'zip',
    'gender'
  ];
  requiredFields.forEach((field)=>{
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });
  if (data.gender === 'female' && !data.userType) {
    errors.push('userType is required for female users');
  }
  return errors;
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 200
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Verify authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }
    const data = await req.json();
    console.log('Received registration data:', data);
    // Validate required fields
    const validationErrors = validateRequired(data);
    console.log('Validation errors:', validationErrors);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    // Validate password match
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    // Validate email format
    if (!validateEmail(data.email)) {
      throw new Error('Invalid email format');
    }
    // Validate password strength
    if (!validatePassword(data.password)) {
      throw new Error('Password must be at least 6 characters long');
    }
    // Check if username exists
    const { data: existingUser, error: userError } = await supabaseClient.from('users').select('username').eq('username', data.username).single();
    if (existingUser) {
      throw new Error('Username already exists');
    }
    // Check if email exists
    const { data: existingEmail, error: emailError } = await supabaseClient.from('users').select('email').eq('email', data.email).single();
    if (existingEmail) {
      throw new Error('Email already registered');
    }
    // Hash password
    const passwordHash = await bcrypt.hash(data.password);
    // Create user record
    const { data: newUser, error: createError } = await supabaseClient.from('users').insert([
      {
        username: data.username,
        email: data.email,
        password_hash: passwordHash,
        hash_type: 'bcrypt',
        first_name: data.firstName,
        last_name: data.lastName,
        mobile_number: data.mobileNumber,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        gender: data.gender,
        user_type: data.userType,
        referred_by: data.referredBy,
        profile_photo: data.profilePhotoUrl,
        banner_photo: data.bannerPhotoUrl,
        front_page_photo: data.frontPagePhotoUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]).select().single();
    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }
    // Create auth session
    const { data: session, error: sessionError } = await supabaseClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true
    });
    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'User registered successfully',
      user: {
        username: newUser.username,
        email: newUser.email
      },
      token: session.user.id
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
