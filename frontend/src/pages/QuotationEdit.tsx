import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Save, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { quotationApi, customerApi, siteApi, roleApi } from '@/api/endpoints';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import type { Quotation, QuotationItem, Customer, Site } from '@/types/models';
import { toast } from 'sonner';

interface QuotationFormData {
  title: string;
  customerId: string;
  siteId: string | null;
  validityDate: string;
  description: string;
  terms: string;
  notes: string;
  items: QuotationItemFormData[];
}

interface QuotationItemFormData {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function QuotationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id;

  const [formData, setFormData] = useState<QuotationFormData>({
    title: '',
    customerId: '',
    siteId: null,
    validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    terms: '',
    notes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof QuotationFormData, string>>>({});
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);

  // Fetch quotation if editing
  const { data: quotationData, isLoading: quotationLoading, error: quotationError } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.get(id!),
    enabled: !!id && !isNew,
  });

  // Fetch customers for dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => customerApi.list({ limit: 1000 }),
  });

  // Fetch sites for dropdown
  const { data: sitesData } = useQuery({
    queryKey: ['sites', 'all'],
    queryFn: () => siteApi.list({ limit: 1000 }),
  });

  // Load quotation data into form
  useEffect(() => {
    if (quotationData?.data && !isNew) {
      const q = quotationData.data;
      setFormData({
        title: q.title,
        customerId: q.customerId,
        siteId: q.siteId || '',
        validityDate: q.validityDate.split('T')[0],
        description: q.description || '',
        terms: q.terms || '',
        notes: q.notes || '',
        items: q.items?.map((item: QuotationItem) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })) || [{ description: '', quantity: 1, unitPrice: 0 }],
      });
    }
  }, [quotationData, isNew]);

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * 0.18; // 18% GST
  const totalAmount = subtotal + taxAmount;

  // Validation
  const validateForm = () => {
    const newErrors: Partial<Record<keyof QuotationFormData, string>> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.customerId) newErrors.customerId = 'Customer is required';
    if (!formData.validityDate) newErrors.validityDate = 'Validity date is required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';

    formData.items.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`item_${index}_description` as keyof QuotationFormData] = 'Description is required';
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity` as keyof QuotationFormData] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice < 0) {
        newErrors[`item_${index}_unitPrice` as keyof QuotationFormData] = 'Unit price cannot be negative';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: QuotationFormData) => quotationApi.create(data),
    onSuccess: () => {
      toast.success('Quotation created successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/quotations');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuotationFormData }) => quotationApi.update(id, data),
    onSuccess: () => {
      toast.success('Quotation updated successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      navigate('/quotations');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update quotation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const itemsWithTotal = formData.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      sortOrder: 0,
    }));

    const payload = {
      title: formData.title,
      customerId: formData.customerId,
      siteId: formData.siteId || null,
      validityDate: new Date(formData.validityDate).toISOString(),
      description: formData.description,
      terms: formData.terms,
      notes: formData.notes,
      subtotal,
      taxAmount,
      totalAmount,
      items: itemsWithTotal,
    };

    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: id!, data: payload });
    }
  };

  // Item handlers
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: keyof QuotationItemFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  if (quotationLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/quotations')} className="btn btn-ghost btn-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>
        <div className="card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (quotationError && !isNew) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/quotations')} className="btn btn-ghost btn-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>
        <div className="card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Failed to Load Quotation</h2>
          <p className="text-gray-600 mt-2">The quotation you're trying to edit doesn't exist.</p>
          <button onClick={() => navigate('/quotations')} className="btn btn-primary mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  const customers = customersData?.data?.data || [];
  const sites = sitesData?.data?.data || [];
  const filteredSites = formData.customerId
    ? sites.filter((s: Site) => s.customerId === formData.customerId)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/quotations')} className="btn btn-ghost btn-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'Create Quotation' : 'Edit Quotation'}</h1>
            <p className="text-gray-600 mt-1">{isNew ? 'Create a new quotation for a customer' : 'Update quotation details'}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Quotation Information</h3>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label htmlFor="title" className="label">Title <span className="text-red-500">*</span></label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className={clsx('input', errors.title && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                    placeholder="Enter quotation title"
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customerId" className="label">Customer <span className="text-red-500">*</span></label>
                    <select
                      id="customerId"
                      value={formData.customerId}
                      onChange={e => setFormData(prev => ({ ...prev, customerId: e.target.value, siteId: null }))}
                      className={clsx('input', errors.customerId && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer: Customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.companyName} ({customer.customerCode})
                        </option>
                      ))}
                    </select>
                    {errors.customerId && <p className="text-red-500 text-sm mt-1">{errors.customerId}</p>}
                  </div>

                  <div>
                    <label htmlFor="siteId" className="label">Site</label>
                    <select
                      id="siteId"
                      value={formData.siteId || ''}
                      onChange={e => setFormData(prev => ({ ...prev, siteId: e.target.value }))}
                      className="input"
                      disabled={filteredSites.length === 0}
                    >
                      <option value="">Select a site (optional)</option>
                      {filteredSites.map((site: Site) => (
                        <option key={site.id} value={site.id}>
                          {site.siteCode} - {site.installationCity || site.installationAddress}
                        </option>
                      ))}
                    </select>
                    {filteredSites.length === 0 && formData.customerId && (
                      <p className="text-gray-500 text-sm mt-1">No sites found for this customer</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="validityDate" className="label">Validity Date <span className="text-red-500">*</span></label>
                  <input
                    id="validityDate"
                    type="date"
                    value={formData.validityDate}
                    onChange={e => setFormData(prev => ({ ...prev, validityDate: e.target.value }))}
                    className={clsx('input', errors.validityDate && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                  />
                  {errors.validityDate && <p className="text-red-500 text-sm mt-1">{errors.validityDate}</p>}
                </div>

                <div>
                  <label htmlFor="description" className="label">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input min-h-[100px]"
                    placeholder="Quotation description..."
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="terms" className="label">Terms & Conditions</label>
                  <textarea
                    id="terms"
                    value={formData.terms}
                    onChange={e => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                    className="input min-h-[100px]"
                    placeholder="Terms and conditions..."
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="label">Notes (Internal)</label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input min-h-[80px]"
                    placeholder="Internal notes..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                <button type="button" onClick={addItem} className="btn btn-secondary btn-sm gap-2">
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
              <div className="card-body">
                {formData.items.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No items added yet. Click "Add Item" to start.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="w-12">#</th>
                            <th>Description</th>
                            <th className="w-32">Quantity</th>
                            <th className="w-40">Unit Price (₹)</th>
                            <th className="w-40">Total (₹)</th>
                            <th className="w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item, index) => (
                            <tr key={item.id || index}>
                              <td className="font-medium">{index + 1}</td>
                              <td>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={e => updateItem(index, 'description', e.target.value)}
                                  className={clsx('input', errors[`item_${index}_description` as keyof QuotationFormData] && 'border-red-500')}
                                  placeholder="Item description"
                                />
                                {errors[`item_${index}_description` as keyof QuotationFormData] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_description` as keyof QuotationFormData]}</p>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  className={clsx('input w-24', errors[`item_${index}_quantity` as keyof QuotationFormData] && 'border-red-500')}
                                  min="1"
                                  step="1"
                                />
                                {errors[`item_${index}_quantity` as keyof QuotationFormData] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_quantity` as keyof QuotationFormData]}</p>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={e => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className={clsx('input w-32', errors[`item_${index}_unitPrice` as keyof QuotationFormData] && 'border-red-500')}
                                  min="0"
                                  step="0.01"
                                />
                                {errors[`item_${index}_unitPrice` as keyof QuotationFormData] && (
                                  <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_unitPrice` as keyof QuotationFormData]}</p>
                                )}
                              </td>
                              <td className="font-medium text-right">
                                ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  disabled={formData.items.length <= 1}
                                  className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 text-right">
                        <p className="text-gray-600">Subtotal</p>
                        <p className="text-gray-600">Tax (18%)</p>
                        <p className="text-xl font-bold text-gray-900">Total</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <p className="text-gray-900">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xl font-bold text-brand-600">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Preview/Summary */}
          <div className="space-y-4">
            <div className="card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Quotation Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium text-gray-900">Draft</p>
                </div>
                <div>
                  <p className="text-gray-500">Items</p>
                  <p className="font-medium text-gray-900">{formData.items.length}</p>
                </div>
                <div>
                  <p className="text-gray-500">Subtotal</p>
                  <p className="font-medium text-gray-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-gray-500">Tax (18%)</p>
                  <p className="font-medium text-gray-900">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-gray-500">Total</p>
                  <p className="text-xl font-bold text-brand-600">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn btn-primary w-full gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isNew ? 'Create Quotation' : 'Save Changes'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/quotations')}
                className="btn btn-secondary w-full gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}