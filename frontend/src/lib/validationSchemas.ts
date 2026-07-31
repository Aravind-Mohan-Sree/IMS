import * as yup from 'yup';

// Indian Mobile Phone Regex: 10 digits with optional +91 prefix
const indianPhoneRegex = /^(\+91[\-\s]?)?[0-9]{10}$/;

export const customerSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required('Customer / Business Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(40, 'Name cannot exceed 40 characters'),
  mobile: yup
    .string()
    .trim()
    .required('Mobile number is required')
    .max(15, 'Mobile number cannot exceed 15 characters')
    .matches(indianPhoneRegex, 'Enter a valid 10-digit mobile number (e.g. 9876543210)'),
  email: yup
    .string()
    .trim()
    .max(50, 'Email cannot exceed 50 characters')
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .email('Enter a valid email address'),
  address: yup
    .string()
    .trim()
    .max(150, 'Address cannot exceed 150 characters'),
  openingBalance: yup
    .number()
    .typeError('Opening balance must be a number')
    .min(0, 'Opening balance cannot be negative'),
  notes: yup
    .string()
    .trim()
    .max(200, 'Notes cannot exceed 200 characters')
});

export const itemSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required('Item name is required')
    .min(2, 'Item name must be at least 2 characters')
    .max(50, 'Item name cannot exceed 50 characters'),
  sku: yup
    .string()
    .trim()
    .required('SKU is required')
    .max(30, 'SKU cannot exceed 30 characters'),
  category: yup
    .string()
    .trim()
    .required('Category is required')
    .max(30, 'Category cannot exceed 30 characters'),
  quantity: yup
    .number()
    .typeError('Quantity must be a valid number')
    .integer('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative'),
  price: yup
    .number()
    .typeError('Selling price must be a valid number')
    .required('Selling price is required')
    .min(0.01, 'Selling price must be greater than ₹0'),
  costPrice: yup
    .number()
    .typeError('Cost price must be a valid number')
    .min(0, 'Cost price cannot be negative'),
  unit: yup
    .string()
    .trim()
    .required('Unit of measurement is required')
    .max(20, 'Unit cannot exceed 20 characters'),
  minStockLevel: yup
    .number()
    .typeError('Minimum stock level must be a number')
    .integer('Minimum stock level must be a whole number')
    .min(0, 'Minimum stock level cannot be negative'),
  description: yup
    .string()
    .trim()
    .max(200, 'Description cannot exceed 200 characters')
});

export const categorySchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required('Category name is required')
    .min(2, 'Category name must be at least 2 characters')
    .max(30, 'Category name cannot exceed 30 characters'),
  description: yup
    .string()
    .trim()
    .max(150, 'Description cannot exceed 150 characters')
});

export const settleDebtSchema = yup.object().shape({
  amount: yup
    .number()
    .typeError('Payment amount must be a valid number')
    .required('Payment amount is required')
    .positive('Payment amount must be greater than ₹0'),
  paymentMethod: yup
    .string()
    .required('Payment method is required'),
  date: yup
    .string()
    .required('Payment date is required'),
  reference: yup
    .string()
    .trim()
    .max(40, 'Reference cannot exceed 40 characters'),
  notes: yup
    .string()
    .trim()
    .max(200, 'Notes cannot exceed 200 characters')
});

export const emailReportSchema = yup.object().shape({
  recipient: yup
    .string()
    .trim()
    .required('Recipient email is required')
    .max(50, 'Recipient email cannot exceed 50 characters')
    .email('Enter a valid recipient email address'),
  subject: yup
    .string()
    .trim()
    .required('Subject is required')
    .max(100, 'Subject cannot exceed 100 characters'),
  message: yup
    .string()
    .trim()
    .required('Message is required')
    .max(500, 'Message cannot exceed 500 characters')
});

export const passwordSchema = yup
  .string()
  .required('Password is required')
  .max(64, 'Password cannot exceed 64 characters')
  .matches(/^\S*$/, 'Password cannot contain spaces')
  .min(8, 'Password must be at least 8 characters long')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter (A-Z)')
  .matches(/[a-z]/, 'Password must contain at least one lowercase letter (a-z)')
  .matches(/[0-9]/, 'Password must contain at least one number (0-9)')
  .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character (e.g. !@#$%^&*)');

export const registerSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required('Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(40, 'Name cannot exceed 40 characters'),
  email: yup
    .string()
    .trim()
    .required('Email is required')
    .max(50, 'Email cannot exceed 50 characters')
    .email('Enter a valid email address'),
  password: passwordSchema
});

export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .trim()
    .required('Email is required')
    .max(50, 'Email cannot exceed 50 characters'),
  password: yup
    .string()
    .trim()
    .required('Password is required')
    .max(64, 'Password cannot exceed 64 characters')
});

export const forgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .trim()
    .required('Email address is required')
    .max(50, 'Email cannot exceed 50 characters')
    .email('Enter a valid email address')
});

export const resetPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .trim()
    .required('Email address is required')
    .max(50, 'Email cannot exceed 50 characters')
    .email('Enter a valid email address'),
  otp: yup
    .string()
    .trim()
    .required('6-digit OTP code is required')
    .length(6, 'OTP must be exactly 6 digits')
    .matches(/^[0-9]+$/, 'OTP code must contain only numbers'),
  newPassword: passwordSchema
});
