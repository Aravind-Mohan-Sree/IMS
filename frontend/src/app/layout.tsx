import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins'
});

export const metadata: Metadata = {
  title: 'Inventory Management System (IMS)',
  description: 'Complete Web Application for Inventory, Customers, Sales, Reports, and Data Export'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased dark`}>
      <body className={`${poppins.className} min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white`}>
        <AuthProvider>
          {children}
          <ToastContainer position="bottom-right" theme="dark" autoClose={3000} />
        </AuthProvider>
      </body>
    </html>
  );
}
