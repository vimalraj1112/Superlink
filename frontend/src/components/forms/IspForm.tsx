import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Wifi, Building2, Loader, FileText } from 'lucide-react';
import { ispApi } from '@/api/endpoints';
import type { ISP } from '@/types/models';
import { toast } from 'sonner';
import Modal from '@/components/common/Modal';

interface IspFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ISP | null;
}

export default function IspForm({ isOpen, onClose, initialData }: IspFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    website: '',
    logoUrl: '',
    latitude: '',
    longitude: '',
    notes: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        displayName: initialData.displayName || '',
        contactPerson: initialData.contactPerson || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        website: initialData.website || '',
        logoUrl: initialData.logoUrl || '',
        latitude: initialData.latitude ? String(initialData.latitude) : '',
        longitude: initialData.longitude ? String(initialData.longitude) : '',
        notes: initialData.notes || '',
        isActive: initialData.isActive ?? true,
      });
    } else {
      // Reset form for new ISP
      setFormData({
        name: '',
        displayName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        website: '',
        logoUrl: '',
        latitude: '',
        longitude: '',
        notes: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'ISP name is required';
    if (!formData.displayName.trim()) newErrors.displayName = 'Display name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }
    if (formData.logoUrl && !/^https?:\/\/.+/.test(formData.logoUrl)) {
      newErrors.logoUrl = 'Logo URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => ispApi.create(data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(isEditing ? 'ISP updated successfully' : 'ISP created successfully');
        queryClient.invalidateQueries({ queryKey: ['isps'] });
        onClose();
        if (!isEditing) {
          navigate(`/isps/${response.data.data.id}`);
        }
      } else {
        toast.error(response.data.message || 'Failed to save ISP');
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.details) {
        const fieldErrors = error.response.data.error.details;
        setErrors(fieldErrors);
      }
      toast.error(error.response?.data?.message || 'Failed to save ISP');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ispApi.update(id, data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('ISP updated successfully');
        queryClient.invalidateQueries({ queryKey: ['isps'] });
        queryClient.invalidateQueries({ queryKey: ['isp', id] });
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to update ISP');
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.details) {
        const fieldErrors = error.response.data.error.details;
        setErrors(fieldErrors);
      }
      toast.error(error.response?.data?.message || 'Failed to update ISP');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData: any = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
    };

    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '') {
        delete submitData[key];
      }
    });

    const ispId = initialData?.id || id;

    if (isEditing && ispId) {
      updateMutation.mutate({ id: ispId, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={isEditing ? 'Edit ISP' : 'Add ISP'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">ISP Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Internal name (e.g., superlink-broadband)"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="label">Display Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                className={`input ${errors.displayName ? 'border-red-500' : ''}`}
                placeholder="Customer-facing name (e.g., SuperLink Broadband Services)"
              />
              {errors.displayName && <p className="text-sm text-red-500 mt-1">{errors.displayName}</p>}
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                className="input"
                placeholder="Contact person name"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="info@isp.com"
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="input"
                placeholder="+91-9876543210"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className={`input ${errors.website ? 'border-red-500' : ''}`}
                placeholder="https://isp.com"
              />
              {errors.website && <p className="text-sm text-red-500 mt-1">{errors.website}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Logo URL</label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => handleChange('logoUrl', e.target.value)}
                className={`input ${errors.logoUrl ? 'border-red-500' : ''}`}
                placeholder="https://isp.com/logo.png"
              />
              {errors.logoUrl && <p className="text-sm text-red-500 mt-1">{errors.logoUrl}</p>}
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Address & Location
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="input"
                rows={2}
                placeholder="Street address, building, floor"
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="input"
                placeholder="Chennai"
              />
            </div>
            <div>
              <label className="label">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="input"
                placeholder="Tamil Nadu"
              />
            </div>
            <div>
              <label className="label">Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
                className="input"
                placeholder="13.0827"
              />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
                className="input"
                placeholder="80.2707"
              />
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Notes
          </h3>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="input"
              rows={3}
              placeholder="Additional notes about this ISP"
            />
          </div>
        </div>

        {/* Status Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-primary-600" />
            Status
          </h3>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Active</span>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create ISP
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}