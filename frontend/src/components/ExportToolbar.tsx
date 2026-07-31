'use client';

import React, { useState } from 'react';
import { FiPrinter, FiFileText, FiMail } from 'react-icons/fi';
import { RiFileExcel2Line } from 'react-icons/ri';
import { EmailModal } from './EmailModal';
import api from '../lib/api';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportToolbarProps {
  title?: string;
  reportType: 'sales' | 'items' | 'items_report' | 'customers' | 'ledger' | 'invoice';
  customerId?: string;
  saleId?: string;
  startDate?: string;
  endDate?: string;
  dataForExport?: Record<string, any>[];
  headersForExport?: { header: string; key: string }[];
  customerEmail?: string;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  reportType,
  customerId,
  saleId,
  startDate,
  endDate,
  dataForExport,
  headersForExport,
  customerEmail
}) => {
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExcelExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (customerId) params.append('customerId', customerId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/export/excel?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel spreadsheet downloaded!');
    } catch (_e) {
      if (dataForExport && dataForExport.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        XLSX.writeFile(workbook, `${reportType}_Report.xlsx`);
        toast.success('Excel spreadsheet generated and downloaded!');
      } else {
        toast.error('Unable to export Excel file right now');
      }
    }
  };

  const handlePDFExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (customerId) params.append('customerId', customerId);
      if (saleId) params.append('saleId', saleId);

      const response = await api.get(`/export/pdf?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_Document.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF document downloaded!');
    } catch (_e) {
      if (dataForExport && dataForExport.length > 0 && headersForExport) {
        const doc = new jsPDF();
        doc.text(`IMS - ${reportType.toUpperCase()} REPORT`, 14, 15);
        const tableHeaders = headersForExport.map(h => h.header);
        const tableRows = dataForExport.map(row => headersForExport.map(h => row[h.key] ?? ''));

        autoTable(doc, {
          head: [tableHeaders],
          body: tableRows,
          startY: 20
        });

        doc.save(`${reportType}_Document.pdf`);
        toast.success('PDF document generated and downloaded!');
      } else {
        toast.error('Unable to export PDF file right now');
      }
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800/80 p-3 sm:p-3.5 rounded-2xl print:hidden shadow-lg backdrop-blur-md mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Export Options:</span>
          <span className="text-xs font-medium px-2.5 py-0.5 sm:py-1 bg-slate-800 text-indigo-300 rounded-lg border border-slate-700">
            {reportType.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* PRINT */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition-all hover:text-white shadow-sm"
            title="Print view or save to printer"
          >
            <FiPrinter className="w-4 h-4 text-sky-400" />
            <span>Print</span>
          </button>

          {/* EXCEL */}
          <button
            onClick={handleExcelExport}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition-all hover:text-white shadow-sm"
            title="Export data as Excel (.xlsx)"
          >
            <RiFileExcel2Line className="w-4 h-4 text-emerald-400" />
            <span>Excel</span>
          </button>

          {/* PDF */}
          <button
            onClick={handlePDFExport}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition-all hover:text-white shadow-sm"
            title="Download PDF document"
          >
            <FiFileText className="w-4 h-4 text-rose-400" />
            <span>PDF</span>
          </button>

          {/* EMAIL */}
          <button
            onClick={() => setIsEmailOpen(true)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/25"
            title="Send report/document via email"
          >
            <FiMail className="w-4 h-4" />
            <span>Email</span>
          </button>
        </div>
      </div>

      <EmailModal
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        defaultRecipient={customerEmail}
        defaultSubject={`IMS ${reportType.toUpperCase()} Document`}
        reportType={reportType}
        customerId={customerId}
        saleId={saleId}
      />
    </>
  );
};
