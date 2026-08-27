import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Loader2, Eye, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { importExportApi, customerApi, siteApi, ispApi } from '@/api/endpoints';
import { toast } from 'sonner';
import Modal from '@/components/common/Modal';

type ImportType = 'customers' | 'sites' | 'payments' | 'tickets';

interface ImportRow {
  row: number;
  data: any;
  valid: boolean;
  errors: string[];
}

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importType, setImportType] = useState<ImportType>('customers');
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);

  // Fetch customers and ISPs for import validation
  const { data: customersData } = useMutation({
    mutationFn: () => customerApi.list({ limit: 100, sortBy: 'companyName', sortOrder: 'asc' }),
  });

  const { data: ispsData } = useMutation({
    mutationFn: () => ispApi.list({ limit: 100, sortBy: 'name', sortOrder: 'asc' }),
  });

  // Download template
  const downloadTemplateMutation = useMutation({
    mutationFn: (type: ImportType) => importExportApi.downloadTemplate(type),
    onSuccess: (response, type) => {
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`${type} template downloaded`);
    },
    onError: () => toast.error('Failed to download template'),
  });

  // Export mutations
  const exportCustomersMutation = useMutation({
    mutationFn: () => importExportApi.exportCustomers(),
    onSuccess: (response) => {
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Customers exported successfully');
    },
    onError: () => toast.error('Failed to export customers'),
  });

  const exportSitesMutation = useMutation({
    mutationFn: () => importExportApi.exportSites(),
    onSuccess: (response) => {
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sites-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Sites exported successfully');
    },
    onError: () => toast.error('Failed to export sites'),
  });

  const exportPaymentsMutation = useMutation({
    mutationFn: () => importExportApi.exportPayments(),
    onSuccess: (response) => {
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Payments exported successfully');
    },
    onError: () => toast.error('Failed to export payments'),
  });

  const exportTicketsMutation = useMutation({
    mutationFn: () => importExportApi.exportTickets(),
    onSuccess: (response) => {
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Tickets exported successfully');
    },
    onError: () => toast.error('Failed to export tickets'),
  });

  // Import preview mutations
  const previewImportCustomersMutation = useMutation({
    mutationFn: (data: any) => importExportApi.previewImportCustomers(data),
    onSuccess: (response) => {
      setPreviewData(response.data.data.results);
      setShowPreview(true);
      toast.success(`Preview ready: ${response.data.data.validRows} valid, ${response.data.data.invalidRows} invalid`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to preview import'),
  });

  const previewImportSitesMutation = useMutation({
    mutationFn: (data: any) => importExportApi.previewImportSites(data),
    onSuccess: (response) => {
      setPreviewData(response.data.data.results);
      setShowPreview(true);
      toast.success(`Preview ready: ${response.data.data.validRows} valid, ${response.data.data.invalidRows} invalid`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to preview import'),
  });

  // Import execute mutations
  const executeImportCustomersMutation = useMutation({
    mutationFn: (data: any) => importExportApi.executeImportCustomers(data),
    onSuccess: (response) => {
      toast.success(`Import completed: ${response.data.data.created} created, ${response.data.data.failed} failed`);
      if (response.data.data.errors.length > 0) {
        setImportErrors(response.data.data.errors);
      }
      resetImport();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to import customers'),
  });

  const executeImportSitesMutation = useMutation({
    mutationFn: (data: any) => importExportApi.executeImportSites(data),
    onSuccess: (response) => {
      toast.success(`Import completed: ${response.data.data.created} created, ${response.data.data.failed} failed`);
      if (response.data.data.errors.length > 0) {
        setImportErrors(response.data.data.errors);
      }
      resetImport();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to import sites'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setSelectedFile(file);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        setParsedData(jsonData);
      } catch (err) {
        toast.error('Failed to parse Excel file');
        setParsedData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePreview = () => {
    if (parsedData.length === 0) {
      toast.error('Please select a file first');
      return;
    }

    if (importType === 'customers') {
      previewImportCustomersMutation.mutate({ customers: parsedData, previewOnly: true });
    } else {
      previewImportSitesMutation.mutate({ sites: parsedData, previewOnly: true });
    }
  };

  const handleExecuteImport = () => {
    if (previewData.length === 0) {
      toast.error('Please preview the import first');
      return;
    }

    const validData = previewData.filter(r => r.valid).map(r => r.data);

    if (validData.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    if (importType === 'customers') {
      executeImportCustomersMutation.mutate({ customers: validData });
    } else {
      executeImportSitesMutation.mutate({ sites: validData });
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setParsedData([]);
    setPreviewData([]);
    setShowPreview(false);
    setImportErrors([]);
    const fileInput = document.getElementById('import-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const getStatusIcon = (valid: boolean) => {
    return valid ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import / Export</h1>
          <p className="text-gray-600 mt-1">Manage bulk data operations with Excel files</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" aria-label="Import Export tabs">
          <button
            onClick={() => setActiveTab('export')}
            className={clsx(
              'pb-3 px-4 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'export'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Export Data
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={clsx(
              'pb-3 px-4 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'import'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Import Data
          </button>
        </nav>
      </div>

      {/* EXPORT TAB */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customers Export */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                Customers
              </h2>
              <button
                onClick={() => downloadTemplateMutation.mutate('customers')}
                className="btn btn-secondary text-sm gap-2"
                disabled={downloadTemplateMutation.isPending}
              >
                <Download className="w-4 h-4" />
                Template
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">Export all customers with sites, tickets, and payments count</p>
            <button
              onClick={() => exportCustomersMutation.mutate()}
              disabled={exportCustomersMutation.isPending}
              className="btn btn-primary w-full gap-2"
            >
              <Download className="w-4 h-4" />
              {exportCustomersMutation.isPending ? 'Exporting...' : 'Export Customers'}
            </button>
          </div>

          {/* Sites Export */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Sites
              </h2>
              <button
                onClick={() => downloadTemplateMutation.mutate('sites')}
                className="btn btn-secondary text-sm gap-2"
                disabled={downloadTemplateMutation.isPending}
              >
                <Download className="w-4 h-4" />
                Template
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">Export all sites with customer, ISP, plan, and billing details</p>
            <button
              onClick={() => exportSitesMutation.mutate()}
              disabled={exportSitesMutation.isPending}
              className="btn btn-primary w-full gap-2"
            >
              <Download className="w-4 h-4" />
              {exportSitesMutation.isPending ? 'Exporting...' : 'Export Sites'}
            </button>
          </div>

          {/* Payments Export */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                Payments
              </h2>
              <button
                onClick={() => downloadTemplateMutation.mutate('payments')}
                className="btn btn-secondary text-sm gap-2"
                disabled={downloadTemplateMutation.isPending}
              >
                <Download className="w-4 h-4" />
                Template
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">Export payments with filters for date range, type, customer, site</p>
            <button
              onClick={() => exportPaymentsMutation.mutate()}
              disabled={exportPaymentsMutation.isPending}
              className="btn btn-primary w-full gap-2"
            >
              <Download className="w-4 h-4" />
              {exportPaymentsMutation.isPending ? 'Exporting...' : 'Export Payments'}
            </button>
          </div>

          {/* Tickets Export */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                Tickets
              </h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">Export tickets with status, priority, source, and assignment details</p>
            <button
              onClick={() => exportTicketsMutation.mutate()}
              disabled={exportTicketsMutation.isPending}
              className="btn btn-primary w-full gap-2"
            >
              <Download className="w-4 h-4" />
              {exportTicketsMutation.isPending ? 'Exporting...' : 'Export Tickets'}
            </button>
          </div>
        </div>
      )}

      {/* IMPORT TAB */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Import Type Selector */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Data Type to Import</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => { setImportType('customers'); resetImport(); }}
                className={clsx(
                  'p-4 border-2 rounded-lg text-left transition-all',
                  importType === 'customers'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Customers</p>
                    <p className="text-sm text-gray-500">Company, contact, address, tax info</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setImportType('sites'); resetImport(); }}
                className={clsx(
                  'p-4 border-2 rounded-lg text-left transition-all',
                  importType === 'sites'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Sites</p>
                    <p className="text-sm text-gray-500">Plan, bandwidth, ISP, location, billing</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setImportType('payments'); resetImport(); }}
                className={clsx(
                  'p-4 border-2 rounded-lg text-left transition-all',
                  importType === 'payments'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Payments</p>
                    <p className="text-sm text-gray-500">Payment records with date, type, amount</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setImportType('tickets'); resetImport(); }}
                className={clsx(
                  'p-4 border-2 rounded-lg text-left transition-all',
                  importType === 'tickets'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Tickets</p>
                    <p className="text-sm text-gray-500">Support tickets with status and priority</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Excel File</h3>

            {!showPreview && !selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Drag & drop Excel file or click to browse</p>
                <p className="text-sm text-gray-500 mb-4">Supports .xlsx and .xls files</p>
                <input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="import-file" className="btn btn-primary cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </label>
              </div>
            ) : !showPreview && selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{parsedData.length} rows parsed</p>
                    </div>
                  </div>
                  <button
                    onClick={resetImport}
                    className="btn btn-secondary text-sm gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Remove
                  </button>
                </div>

                {/* Preview of first few rows */}
                {parsedData.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {Object.keys(parsedData[0]).slice(0, 8).map(key => (
                            <th key={key} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{key}</th>
                          ))}
                          {Object.keys(parsedData[0]).length > 8 && (
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">...</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-gray-200">
                            {Object.values(row).slice(0, 8).map((val, j) => (
                              <td key={j} className="px-3 py-2 text-gray-900 truncate max-w-[150px]">{String(val)}</td>
                            ))}
                            {Object.values(row).length > 8 && (
                              <td className="px-3 py-2 text-gray-500">+{Object.values(row).length - 8} more</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={resetImport}
                    className="btn btn-secondary"
                    disabled={previewImportCustomersMutation.isPending || previewImportSitesMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePreview}
                    className="btn btn-primary gap-2"
                    disabled={previewImportCustomersMutation.isPending || previewImportSitesMutation.isPending}
                  >
                    <Eye className="w-4 h-4" />
                    {previewImportCustomersMutation.isPending || previewImportSitesMutation.isPending ? 'Previewing...' : 'Preview Import'}
                  </button>
                </div>
              </div>
            ) : showPreview ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Import Preview ({previewData.length} rows)</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {previewData.filter(r => r.valid).length} Valid
                    </span>
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {previewData.filter(r => !r.valid).length} Invalid
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 sticky top-0">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-12">Row</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-12">Status</th>
                        {Object.keys(previewData[0]?.data || {}).slice(0, 6).map(key => (
                          <th key={key} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{key}</th>
                        ))}
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((item) => (
                        <tr key={item.row} className="border-t border-gray-200">
                          <td className="px-3 py-2 text-gray-900">{item.row}</td>
                          <td className="px-3 py-2">{getStatusIcon(item.valid)}</td>
                          {Object.values(item.data).slice(0, 6).map((val, j) => (
                            <td key={j} className="px-3 py-2 text-gray-900 truncate max-w-[150px]">{String(val)}</td>
                          ))}
                          <td className="px-3 py-2">
                            {item.errors.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.errors.map((err, i) => (
                                  <span key={i} className="badge-danger text-xs px-2 py-0.5">{err}</span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="btn btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleExecuteImport}
                    className="btn btn-primary gap-2"
                    disabled={executeImportCustomersMutation.isPending || executeImportSitesMutation.isPending || previewData.filter(r => r.valid).length === 0}
                  >
                    <Upload className="w-4 h-4" />
                    {executeImportCustomersMutation.isPending || executeImportSitesMutation.isPending ? 'Importing...' : `Import ${previewData.filter(r => r.valid).length} Valid Rows`}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Import Errors */}
            {importErrors.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Import Errors ({importErrors.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {importErrors.map((err, i) => (
                    <div key={i} className="text-sm text-red-700 bg-white p-2 rounded border border-red-100">
                      <span className="font-medium">Row {err.data?.row || 'N/A'}:</span> {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}