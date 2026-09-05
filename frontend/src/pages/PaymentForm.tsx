import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { customerApi, siteApi, paymentApi } from '@/api/endpoints';
import type { Customer, Site, Payment } from '@/types/models';
import { PaymentType } from '@/types/enums';
import { toast } from 'sonner';

interface FormData {
  customerId: string;
  siteId: string | undefined;
  amount: string;
  type: PaymentType;
  description: string;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
  referenceNumber: string;
  invoiceNumber: string;
  notes: string;
}

const initialFormData: FormData = {
  customerId: '',
  siteId: undefined,
  amount: '',
  type: PaymentType.MRC,
  description: '',
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMethod: '',
  transactionId: '',
  referenceNumber: '',
  invoiceNumber: '',
  notes: '',
};

export default function PaymentForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [showSiteSearch, setShowSiteSearch] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');
  const [sitePage, setSitePage] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch payment data if editing
  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentApi.get(id!),
    enabled: isEditing,
  });

  // Fetch customers for search
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers-search', customerSearch, customerPage],
    queryFn: () => customerApi.list({ page: customerPage, limit: 10, search: customerSearch || undefined, isActive: true }),
    enabled: showCustomerSearch,
  });

  // Fetch sites for selected customer
  const { data: sitesData, isLoading: sitesLoading } = useQuery({
    queryKey: ['sites-search', formData.customerId, siteSearch, sitePage],
    queryFn: () => siteApi.list({ page: sitePage, limit: 10, customerId: formData.customerId, search: siteSearch || undefined }),
    enabled: showSiteSearch && !!formData.customerId,
  });

  // Populate form when editing
  useEffect(() => {
    if (paymentData?.data?.data) {
      const payment = paymentData.data.data;
      setFormData({
        customerId: payment.customerId,
        siteId: payment.siteId || '',
        amount: String(payment.amount),
        type: payment.type,
        description: payment.description || '',
        paymentDate: payment.paymentDate.split('T')[0],
        paymentMethod: payment.paymentMethod || '',
        transactionId: payment.transactionId || '',
        referenceNumber: payment.referenceNumber || '',
        invoiceNumber: payment.invoiceNumber || '',
        notes: payment.notes || '',
      });
      if (payment.customer) {
        setSelectedCustomer(payment.customer);
      }
    }
  }, [paymentData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) newErrors.customerId = 'Customer is required';
    if (!formData.amount || formData.amount === '') {
      newErrors.amount = 'Amount is required';
    } else if (Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: isEditing
      ? (data: FormData) => paymentApi.update(id!, data)
      : (data: FormData) => paymentApi.create(data),
    onSuccess: () => {
      toast.success(isEditing ? 'Payment updated successfully' : 'Payment created successfully');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/payments');
    },
    onError: (err: any) => {
      if (err.response?.data?.error?.details) {
        const fieldErrors = err.response.data.error.details;
        setErrors(fieldErrors);
      }
      const message = err.response?.data?.message || (isEditing ? 'Failed to update payment' : 'Failed to create payment');
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData: FormData = {
      customerId: formData.customerId,
      siteId: formData.siteId,
      amount: formData.amount,
      type: formData.type,
      description: formData.description,
      paymentDate: formData.paymentDate,
      paymentMethod: formData.paymentMethod,
      transactionId: formData.transactionId,
      referenceNumber: formData.referenceNumber,
      invoiceNumber: formData.invoiceNumber,
      notes: formData.notes,
    };
    mutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'customerId') {
      setSelectedCustomer(null);
      setFormData(prev => ({ ...prev, siteId: undefined }));
    }
  };

  if (isEditing && paymentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/payments" className="btn btn-secondary gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Payment' : 'Create Payment'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Customer Selection */}
        <div className="space-y-2">
          <label className="label">Customer *</label>
          <div className="relative">
            <input
              type="text"
              value={selectedCustomer ? `${selectedCustomer.companyName} (${selectedCustomer.customerCode})` : ''}
              onClick={() => setShowCustomerSearch(true)}
              readOnly
              className={`input cursor-pointer ${errors.customerId ? 'border-red-500' : ''}`}
              placeholder="Select a customer"
            />
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setFormData(prev => ({ ...prev, customerId: '', siteId: undefined }));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {errors.customerId && <p className="text-sm text-red-500 mt-1">{errors.customerId}</p>}
          <input
            type="hidden"
            name="customerId"
            value={formData.customerId}
            onChange={handleChange}
          />

          {/* Customer Search Modal */}
          {showCustomerSearch && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Select Customer</h3>
                  <button onClick={() => setShowCustomerSearch(false)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 border-b border-gray-200">
                  <Search className="w-5 h-5 text-gray-400 absolute mt-2.5 ml-3" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setCustomerPage(1); }}
                    className="input pl-10"
                  />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {customersLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                  ) : customersData?.data?.data?.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No customers found</div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {customersData?.data?.data.map((customer: Customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setFormData(prev => ({ ...prev, customerId: customer.id }));
                            setShowCustomerSearch(false);
                          }}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <p className="font-medium text-gray-900">{customer.companyName}</p>
                          <p className="text-sm text-gray-500">{customer.customerCode} • {customer.contactPerson} • {customer.city}</p>
                        </button>
                      ))}
                      {customersData?.data?.meta && customersData.data.meta.totalPages > 1 && (
                        <div className="p-4 flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCustomerPage(p => Math.max(1, p - 1))}
                            disabled={customerPage <= 1}
                            className="btn btn-secondary text-sm"
                          >
                            Previous
                          </button>
                          <span className="flex items-center text-sm text-gray-600 px-2">
                            Page {customerPage} of {customersData.data.meta.totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCustomerPage(p => Math.min(customersData.data.meta.totalPages, p + 1))}
                            disabled={customerPage >= customersData.data.meta.totalPages}
                            className="btn btn-secondary text-sm"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Site Selection */}
        <div className="space-y-2">
          <label className="label">Site (Optional)</label>
          <div className="relative">
            {formData.customerId ? (
              <>
                <select
                  name="siteId"
                  value={formData.siteId}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select a site (optional)</option>
                  {sitesData?.data?.data.map((site: Site) => (
                    <option key={site.id} value={site.id}>
                      {site.siteCode} - {site.planName}
                    </option>
                  ))}
                </select>
                {sitesLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary-600" />}
              </>
            ) : (
              <input
                type="text"
                value=""
                readOnly
                className="input bg-gray-100 cursor-not-allowed"
                placeholder="Select a customer first"
              />
            )}
          </div>
        </div>

        {/* Amount & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label">Amount *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              className={`input ${errors.amount ? 'border-red-500' : ''}`}
              placeholder="Enter amount"
              required
            />
            {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
          </div>
          <div className="space-y-2">
            <label className="label">Type *</label>
            <select name="type" value={formData.type} onChange={handleChange} className={`input ${errors.type ? 'border-red-500' : ''}`}>
              <option value={PaymentType.OTC}>OTC (One Time Charge)</option>
              <option value={PaymentType.MRC}>MRC (Monthly Recurring)</option>
              <option value={PaymentType.STATIC_IP}>Static IP Charge</option>
              <option value={PaymentType.OTHER}>Other</option>
            </select>
            {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
          </div>
        </div>

        {/* Payment Date */}
        <div className="space-y-2">
          <label className="label">Payment Date *</label>
          <input
            type="date"
            name="paymentDate"
            value={formData.paymentDate}
            onChange={handleChange}
            className={`input ${errors.paymentDate ? 'border-red-500' : ''}`}
            required
          />
          {errors.paymentDate && <p className="text-sm text-red-500 mt-1">{errors.paymentDate}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="label">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="input"
            placeholder="Payment description"
          />
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label">Payment Method</label>
            <input
              type="text"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Cash, UPI, Bank Transfer, Card"
            />
          </div>
          <div className="space-y-2">
            <label className="label">Transaction ID</label>
            <input
              type="text"
              name="transactionId"
              value={formData.transactionId}
              onChange={handleChange}
              className="input"
              placeholder="Transaction reference"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label">Reference Number</label>
            <input
              type="text"
              name="referenceNumber"
              value={formData.referenceNumber}
              onChange={handleChange}
              className="input"
              placeholder="Reference number"
            />
          </div>
          <div className="space-y-2">
            <label className="label">Invoice Number</label>
            <input
              type="text"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleChange}
              className="input"
              placeholder="Invoice number"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="label">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="input"
            placeholder="Additional notes"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link to="/payments" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn btn-primary gap-2"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {isEditing ? 'Update Payment' : 'Create Payment'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}