import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, MapPin, Building2, Mail, Phone, FileText, DollarSign } from 'lucide-react';
import { customerApi } from '@/api/endpoints';
import type { Customer } from '@/types/models';
import { toast } from 'sonner';
import Modal from '@/components/common/Modal';

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Customer | null;
}

export default function CustomerForm({ isOpen, onClose, initialData }: CustomerFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    customerCode: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    panNumber: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingPincode: '',
    notes: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        customerCode: initialData.customerCode || '',
        companyName: initialData.companyName || '',
        contactPerson: initialData.contactPerson || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        alternatePhone: initialData.alternatePhone || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
        gstNumber: initialData.gstNumber || '',
        panNumber: initialData.panNumber || '',
        billingAddress: initialData.billingAddress || '',
        billingCity: initialData.billingCity || '',
        billingState: initialData.billingState || '',
        billingPincode: initialData.billingPincode || '',
        notes: initialData.notes || '',
        isActive: initialData.isActive ?? true,
      });
      setSameAsBilling(
        initialData.billingAddress === initialData.address &&
        initialData.billingCity === initialData.city &&
        initialData.billingState === initialData.state &&
        initialData.billingPincode === initialData.pincode
      );
    } else {
      // Reset form for new customer
      setFormData({
        customerCode: '',
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        alternatePhone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gstNumber: '',
        panNumber: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingPincode: '',
        notes: '',
        isActive: true,
      });
      setSameAsBilling(true);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerCode.trim()) newErrors.customerCode = 'Customer code is required';
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Contact person is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = 'Pincode must be 6 digits';

    if (!sameAsBilling) {
      if (!formData.billingAddress.trim()) newErrors.billingAddress = 'Billing address is required';
      if (!formData.billingCity.trim()) newErrors.billingCity = 'Billing city is required';
      if (!formData.billingState.trim()) newErrors.billingState = 'Billing state is required';
      if (!formData.billingPincode.trim()) newErrors.billingPincode = 'Billing pincode is required';
      else if (!/^\d{6}$/.test(formData.billingPincode)) newErrors.billingPincode = 'Pincode must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSameAsBillingChange = (checked: boolean) => {
    setSameAsBilling(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        billingAddress: prev.address,
        billingCity: prev.city,
        billingState: prev.state,
        billingPincode: prev.pincode,
      }));
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));

    // Auto-sync billing fields if same as billing
    if (sameAsBilling && ['address', 'city', 'state', 'pincode'].includes(field)) {
      const billingField = `billing${field.charAt(0).toUpperCase() + field.slice(1)}`;
      setFormData(prev => ({ ...prev, [billingField]: value }));
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => customerApi.create(data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(isEditing ? 'Customer updated successfully' : 'Customer created successfully');
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        onClose();
        if (!isEditing) {
          navigate(`/customers/${response.data.data.id}`);
        }
      } else {
        toast.error(response.data.message || 'Failed to save customer');
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.details) {
        const fieldErrors = error.response.data.error.details;
        setErrors(fieldErrors);
      }
      toast.error(error.response?.data?.message || 'Failed to save customer');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => customerApi.update(id, data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Customer updated successfully');
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['customer', id] });
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to update customer');
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.details) {
        const fieldErrors = error.response.data.error.details;
        setErrors(fieldErrors);
      }
      toast.error(error.response?.data?.message || 'Failed to update customer');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData = { ...formData };
    if (!submitData.customerCode) {
      const { customerCode, ...rest } = submitData;
      Object.assign(submitData, rest);
    }

    if (isEditing && id) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={isEditing ? 'Edit Customer' : 'Add Customer'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Customer Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.customerCode}
                onChange={(e) => handleChange('customerCode', e.target.value)}
                className={`input ${errors.customerCode ? 'border-red-500' : ''}`}
                placeholder={isEditing ? 'Auto-generated' : 'Auto-generated if left empty'}
                disabled={isEditing}
              />
              {errors.customerCode && <p className="text-sm text-red-500 mt-1">{errors.customerCode}</p>}
            </div>
            <div>
              <label className="label">Company Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className={`input ${errors.companyName ? 'border-red-500' : ''}`}
                placeholder="Company name"
              />
              {errors.companyName && <p className="text-sm text-red-500 mt-1">{errors.companyName}</p>}
            </div>
            <div>
              <label className="label">Contact Person <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                className={`input ${errors.contactPerson ? 'border-red-500' : ''}`}
                placeholder="Contact person name"
              />
              {errors.contactPerson && <p className="text-sm text-red-500 mt-1">{errors.contactPerson}</p>}
            </div>
            <div>
              <label className="label">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="email@company.com"
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="label">Phone <span className="text-red-500">*</span></label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`input ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="+91-9876543210"
              />
              {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="label">Alternate Phone</label>
              <input
                type="tel"
                value={formData.alternatePhone}
                onChange={(e) => handleChange('alternatePhone', e.target.value)}
                className="input"
                placeholder="+91-9876543211"
              />
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Installation Address
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Address <span className="text-red-500">*</span></label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className={`input ${errors.address ? 'border-red-500' : ''}`}
                rows={2}
                placeholder="Street address, building, floor"
              />
              {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address}</p>}
            </div>
            <div>
              <label className="label">City <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className={`input ${errors.city ? 'border-red-500' : ''}`}
                placeholder="Chennai"
              />
              {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="label">State <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className={`input ${errors.state ? 'border-red-500' : ''}`}
                placeholder="Tamil Nadu"
              />
              {errors.state && <p className="text-sm text-red-500 mt-1">{errors.state}</p>}
            </div>
            <div>
              <label className="label">Pincode <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                className={`input ${errors.pincode ? 'border-red-500' : ''}`}
                placeholder="600001"
                maxLength={6}
              />
              {errors.pincode && <p className="text-sm text-red-500 mt-1">{errors.pincode}</p>}
            </div>
          </div>
        </div>

        {/* Billing Address Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Billing Address
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => handleSameAsBillingChange(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Same as installation address</span>
            </label>
          </div>

          {!sameAsBilling && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Billing Address <span className="text-red-500">*</span></label>
                <textarea
                  value={formData.billingAddress}
                  onChange={(e) => handleChange('billingAddress', e.target.value)}
                  className={`input ${errors.billingAddress ? 'border-red-500' : ''}`}
                  rows={2}
                  placeholder="Billing street address"
                />
                {errors.billingAddress && <p className="text-sm text-red-500 mt-1">{errors.billingAddress}</p>}
              </div>
              <div>
                <label className="label">Billing City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.billingCity}
                  onChange={(e) => handleChange('billingCity', e.target.value)}
                  className={`input ${errors.billingCity ? 'border-red-500' : ''}`}
                  placeholder="Chennai"
                />
                {errors.billingCity && <p className="text-sm text-red-500 mt-1">{errors.billingCity}</p>}
              </div>
              <div>
                <label className="label">Billing State <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.billingState}
                  onChange={(e) => handleChange('billingState', e.target.value)}
                  className={`input ${errors.billingState ? 'border-red-500' : ''}`}
                  placeholder="Tamil Nadu"
                />
                {errors.billingState && <p className="text-sm text-red-500 mt-1">{errors.billingState}</p>}
              </div>
              <div>
                <label className="label">Billing Pincode <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.billingPincode}
                  onChange={(e) => handleChange('billingPincode', e.target.value)}
                  className={`input ${errors.billingPincode ? 'border-red-500' : ''}`}
                  placeholder="600001"
                  maxLength={6}
                />
                {errors.billingPincode && <p className="text-sm text-red-500 mt-1">{errors.billingPincode}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Tax & Additional Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" />
            Tax Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">GST Number</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                className="input"
                placeholder="33AAACT1234F1Z5"
                maxLength={15}
              />
            </div>
            <div>
              <label className="label">PAN Number</label>
              <input
                type="text"
                value={formData.panNumber}
                onChange={(e) => handleChange('panNumber', e.target.value)}
                className="input"
                placeholder="AAACT1234F"
                maxLength={10}
              />
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Additional Notes
          </h3>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="input"
              rows={3}
              placeholder="Any additional notes about this customer..."
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">Active</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Customer
          </button>
        </div>
      </form>
    </Modal>
  );
}