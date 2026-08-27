import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, User, MapPin, AlertTriangle, Flag, MessageSquare, Hash } from 'lucide-react';
import { ticketApi, customerApi, siteApi, userApi } from '@/api/endpoints';
import type { Ticket } from '@/types/models';
import {
  TicketStatus,
  TicketStatusLabels,
  TicketPriority,
  TicketPriorityLabels,
  TicketSource,
  TicketSourceLabels,
} from '@/types/enums';
import { toast } from 'sonner';
import Modal from '@/components/common/Modal';

interface TicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Ticket | null;
}

export default function TicketForm({ isOpen, onClose, initialData }: TicketFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    source: 'MANUAL',
    customerId: '',
    siteId: '',
    assignedToId: '',
    slaDueAt: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'OPEN',
        priority: initialData.priority || 'MEDIUM',
        source: initialData.source || 'MANUAL',
        customerId: initialData.customerId || '',
        siteId: initialData.siteId || '',
        assignedToId: initialData.assignedToId || '',
        slaDueAt: initialData.slaDueAt ? new Date(initialData.slaDueAt).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'OPEN',
        priority: 'MEDIUM',
        source: 'MANUAL',
        customerId: '',
        siteId: '',
        assignedToId: '',
        slaDueAt: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const { data: customersData } = useQuery({
    queryKey: ['ticket-form-customers'],
    queryFn: () => customerApi.list({ limit: 100, sortBy: 'companyName', sortOrder: 'asc' }),
    enabled: isOpen,
  });

  const { data: sitesData } = useQuery({
    queryKey: ['ticket-form-sites', formData.customerId],
    queryFn: () => siteApi.list({ limit: 100, customerId: formData.customerId || undefined, sortBy: 'siteCode', sortOrder: 'asc' }),
    enabled: isOpen && !!formData.customerId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['ticket-form-users'],
    queryFn: () => userApi.list({ limit: 100, sortBy: 'firstName', sortOrder: 'asc' }),
    enabled: isOpen,
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.customerId) newErrors.customerId = 'Customer is required';
    if (!formData.status) newErrors.status = 'Status is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    if (!formData.source) newErrors.source = 'Source is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));

    // Clear siteId when customer changes
    if (field === 'customerId') {
      setFormData(prev => ({ ...prev, siteId: '' }));
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => ticketApi.create(data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(isEditing ? 'Ticket updated successfully' : 'Ticket created successfully');
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        onClose();
        if (!isEditing) {
          navigate(`/tickets/${response.data.data.id}`);
        }
      } else {
        toast.error(response.data.message || 'Failed to save ticket');
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.details) {
        const fieldErrors = error.response.data.error.details;
        setErrors(fieldErrors);
      }
      toast.error(error.response?.data?.message || 'Failed to save ticket');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => ticketApi.update(id, data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Ticket updated successfully');
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['ticket', id] });
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to update ticket');
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.details) {
        const fieldErrors = error.response.data.error.details;
        setErrors(fieldErrors);
      }
      toast.error(error.response?.data?.message || 'Failed to update ticket');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData: any = { ...formData };

    // Convert SLA date
    if (submitData.slaDueAt) submitData.slaDueAt = new Date(submitData.slaDueAt).toISOString();

    // Remove empty fields
    if (!submitData.siteId) delete submitData.siteId;
    if (!submitData.assignedToId) delete submitData.assignedToId;
    if (!submitData.slaDueAt) delete submitData.slaDueAt;

    if (isEditing && id) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={isEditing ? 'Edit Ticket' : 'Create Ticket'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-600" />
            Basic Information
          </h3>
          <div>
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`input ${errors.title ? 'border-red-500' : ''}`}
              placeholder="Enter ticket title"
            />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input"
              rows={4}
              placeholder="Enter ticket description..."
            />
          </div>
        </div>

        {/* Customer & Site Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Customer & Site
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Customer <span className="text-red-500">*</span></label>
              <select
                value={formData.customerId}
                onChange={(e) => handleChange('customerId', e.target.value)}
                className={`input ${errors.customerId ? 'border-red-500' : ''}`}
              >
                <option value="">Select Customer</option>
                {(customersData?.data?.data || []).map((customer: any) => (
                  <option key={customer.id} value={customer.id}>{customer.companyName}</option>
                ))}
              </select>
              {errors.customerId && <p className="text-sm text-red-500 mt-1">{errors.customerId}</p>}
            </div>
            <div>
              <label className="label">Site</label>
              <select
                value={formData.siteId}
                onChange={(e) => handleChange('siteId', e.target.value)}
                className="input"
                disabled={!formData.customerId}
              >
                <option value="">Select Site</option>
                {(sitesData?.data?.data || []).map((site: any) => (
                  <option key={site.id} value={site.id}>{site.siteCode} - {site.planName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Classification Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary-600" />
            Classification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Status <span className="text-red-500">*</span></label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className={`input ${errors.status ? 'border-red-500' : ''}`}
              >
                {Object.values(TicketStatus).map(value => (
                  <option key={value} value={value}>{TicketStatusLabels[value]}</option>
                ))}
              </select>
              {errors.status && <p className="text-sm text-red-500 mt-1">{errors.status}</p>}
            </div>
            <div>
              <label className="label">Priority <span className="text-red-500">*</span></label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className={`input ${errors.priority ? 'border-red-500' : ''}`}
              >
                {Object.values(TicketPriority).map(value => (
                  <option key={value} value={value}>{TicketPriorityLabels[value]}</option>
                ))}
              </select>
              {errors.priority && <p className="text-sm text-red-500 mt-1">{errors.priority}</p>}
            </div>
            <div>
              <label className="label">Source <span className="text-red-500">*</span></label>
              <select
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className={`input ${errors.source ? 'border-red-500' : ''}`}
              >
                {Object.values(TicketSource).map(value => (
                  <option key={value} value={value}>{TicketSourceLabels[value]}</option>
                ))}
              </select>
              {errors.source && <p className="text-sm text-red-500 mt-1">{errors.source}</p>}
            </div>
          </div>
        </div>

        {/* Assignment Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary-600" />
            Assignment & SLA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Assigned To</label>
              <select
                value={formData.assignedToId}
                onChange={(e) => handleChange('assignedToId', e.target.value)}
                className="input"
              >
                <option value="">Unassigned</option>
                {(usersData?.data?.data || []).map((user: any) => (
                  <option key={user.id} value={user.id}>{user.firstName} {user.lastName} ({user.role?.name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">SLA Due Date</label>
              <input
                type="date"
                value={formData.slaDueAt}
                onChange={(e) => handleChange('slaDueAt', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-secondary">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Ticket
          </button>
        </div>
      </form>
    </Modal>
  );
}