import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, MapPin, Building2, Wifi, DollarSign, Calendar, Hash, Settings } from 'lucide-react';
import { siteApi, customerApi, ispApi } from '@/api/endpoints';
import type { Site } from '@/types/models';
import { SiteStatus, SiteStatusLabels, ConnectionType, ConnectionTypeLabels } from '@/types/enums';
import { toast } from 'sonner';
import Modal from '@/components/common/Modal';
import CoordinatePicker from '@/components/map/CoordinatePicker';
import SearchableSelect from '@/components/common/SearchableSelect';

interface SiteFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Site | null;
}

export default function SiteForm({ isOpen, onClose, initialData }: SiteFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    siteCode: '',
    customerId: '',
    ispId: '',
    planName: '',
    bandwidth: '',
    mrc: '',
    otc: '',
    staticIpCharge: '',
    staticIpCount: 0,
    otherCharges: '',
    status: 'FEASIBILITY_PENDING',
    installationAddress: '',
    installationCity: '',
    installationState: '',
    installationPincode: '',
    latitude: '',
    longitude: '',
    connectionType: '',
    circuitId: '',
    provisionedAt: '',
    renewalDate: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        siteCode: initialData.siteCode || '',
        customerId: initialData.customerId || '',
        ispId: initialData.ispId || '',
        planName: initialData.planName || '',
        bandwidth: initialData.bandwidth || '',
        mrc: initialData.mrc?.toString() || '',
        otc: initialData.otc?.toString() || '',
        staticIpCharge: initialData.staticIpCharge?.toString() || '',
        staticIpCount: initialData.staticIpCount || 0,
        otherCharges: initialData.otherCharges?.toString() || '',
        status: initialData.status || 'FEASIBILITY_PENDING',
        installationAddress: initialData.installationAddress || '',
        installationCity: initialData.installationCity || '',
        installationState: initialData.installationState || '',
        installationPincode: initialData.installationPincode || '',
        latitude: initialData.latitude?.toString() || '',
        longitude: initialData.longitude?.toString() || '',
        connectionType: initialData.connectionType || '',
        circuitId: initialData.circuitId || '',
        provisionedAt: initialData.provisionedAt ? new Date(initialData.provisionedAt).toISOString().split('T')[0] : '',
        renewalDate: initialData.renewalDate ? new Date(initialData.renewalDate).toISOString().split('T')[0] : '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        siteCode: '',
        customerId: '',
        ispId: '',
        planName: '',
        bandwidth: '',
        mrc: '',
        otc: '',
        staticIpCharge: '',
        staticIpCount: 0,
        otherCharges: '',
        status: 'FEASIBILITY_PENDING',
        installationAddress: '',
        installationCity: '',
        installationState: '',
        installationPincode: '',
        latitude: '',
        longitude: '',
        connectionType: '',
        circuitId: '',
        provisionedAt: '',
        renewalDate: '',
        notes: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const { data: customersData } = useQuery({
    queryKey: ['site-form-customers'],
    queryFn: () => customerApi.list({ limit: 100, sortBy: 'companyName', sortOrder: 'asc' }),
    enabled: isOpen,
  });

  const { data: ispsData } = useQuery({
    queryKey: ['site-form-isps'],
    queryFn: () => ispApi.list({ limit: 100, sortBy: 'name', sortOrder: 'asc' }),
    enabled: isOpen,
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) newErrors.customerId = 'Customer is required';
    if (!formData.ispId) newErrors.ispId = 'ISP is required';
    if (!formData.planName.trim()) newErrors.planName = 'Plan name is required';
    if (!formData.bandwidth.trim()) newErrors.bandwidth = 'Bandwidth is required';
    if (!formData.status) newErrors.status = 'Status is required';
    if (!formData.installationAddress.trim()) newErrors.installationAddress = 'Installation address is required';
    if (!formData.installationCity.trim()) newErrors.installationCity = 'Installation city is required';
    if (!formData.installationState.trim()) newErrors.installationState = 'Installation state is required';
    if (!formData.installationPincode.trim()) newErrors.installationPincode = 'Installation pincode is required';
    else if (!/^\d{6}$/.test(formData.installationPincode)) newErrors.installationPincode = 'Pincode must be 6 digits';

    // MRC is required (positive number)
    if (!formData.mrc || formData.mrc === '') {
      newErrors.mrc = 'MRC is required';
    } else if (Number(formData.mrc) <= 0) {
      newErrors.mrc = 'MRC must be greater than 0';
    }

    // OTC is required (nonnegative number)
    if (!formData.otc || formData.otc === '') {
      newErrors.otc = 'OTC is required';
    } else if (Number(formData.otc) < 0) {
      newErrors.otc = 'OTC must be 0 or greater';
    }

    // Optional numeric fields
    const optionalNumericFields = ['staticIpCharge', 'otherCharges'];
    optionalNumericFields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      if (value && value !== '' && !(Number(value) >= 0)) {
        newErrors[field] = 'Must be a valid number';
      }
    });

    // Static IP Count
    const staticIpCount = formData.staticIpCount;
    const staticIpCountNum = Number(staticIpCount);
    const hasStaticIpCount = staticIpCount !== undefined && staticIpCount !== null && String(staticIpCount) !== '';
    if (hasStaticIpCount && (staticIpCountNum < 0 || !Number.isInteger(staticIpCountNum))) {
      newErrors.staticIpCount = 'Must be a valid integer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCoordinateSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => siteApi.create(data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(isEditing ? 'Site updated successfully' : 'Site created successfully');
        queryClient.invalidateQueries({ queryKey: ['sites'] });
        onClose();
        if (!isEditing) {
          navigate(`/sites/${response.data.data.id}`);
        }
      } else {
        toast.error(response.data.message || 'Failed to save site');
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.details) {
        const fieldErrors = error.response.data.error.details;
        setErrors(fieldErrors);
      }
      toast.error(error.response?.data?.message || 'Failed to save site');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => siteApi.update(id, data),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Site updated successfully');
        queryClient.invalidateQueries({ queryKey: ['sites'] });
        queryClient.invalidateQueries({ queryKey: ['site', id] });
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to update site');
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.details) {
        const fieldErrors = error.response.data.error.details;
        setErrors(fieldErrors);
      }
      toast.error(error.response?.data?.message || 'Failed to update site');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData: any = { ...formData };

    // Convert numeric strings to numbers
    const numericFields = ['mrc', 'otc', 'staticIpCharge', 'otherCharges'];
    numericFields.forEach(field => {
      if (submitData[field]) submitData[field] = parseFloat(submitData[field]);
      else delete submitData[field];
    });

    submitData.staticIpCount = parseInt(submitData.staticIpCount) || 0;

    // Convert dates
    if (submitData.provisionedAt) submitData.provisionedAt = new Date(submitData.provisionedAt).toISOString();
    if (submitData.renewalDate) submitData.renewalDate = new Date(submitData.renewalDate).toISOString();

    // Convert coordinates
    if (submitData.latitude) submitData.latitude = parseFloat(submitData.latitude);
    if (submitData.longitude) submitData.longitude = parseFloat(submitData.longitude);

    // Remove empty siteCode for auto-generation on create
    if (!submitData.siteCode) delete submitData.siteCode;

    if (isEditing && id) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title={isEditing ? 'Edit Site' : 'Add Site'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & ISP Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            Customer & ISP
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Site Code</label>
              <input
                type="text"
                value={formData.siteCode}
                onChange={(e) => handleChange('siteCode', e.target.value)}
                className="input"
                placeholder={isEditing ? 'Auto-generated' : 'Auto-generated if empty'}
                disabled={isEditing}
              />
            </div>
            <div>
              <SearchableSelect
                label="Customer"
                value={formData.customerId}
                onChange={(value) => handleChange('customerId', value)}
                options={(customersData?.data?.data || []).map((customer: any) => ({
                  value: customer.id,
                  label: customer.companyName,
                }))}
                placeholder="Select Customer"
                error={errors.customerId}
                required
              />
            </div>
            <div>
              <SearchableSelect
                label="ISP"
                value={formData.ispId}
                onChange={(value) => handleChange('ispId', value)}
                options={(ispsData?.data?.data || []).map((isp: any) => ({
                  value: isp.id,
                  label: isp.displayName || isp.name,
                }))}
                placeholder="Select ISP"
                error={errors.ispId}
                required
              />
            </div>
            <div>
              <label className="label">Status <span className="text-red-500">*</span></label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className={`input ${errors.status ? 'border-red-500' : ''}`}
              >
                {Object.values(SiteStatus).map(value => (
                  <option key={value} value={value}>{SiteStatusLabels[value]}</option>
                ))}
              </select>
              {errors.status && <p className="text-sm text-red-500 mt-1">{errors.status}</p>}
            </div>
          </div>
        </div>

        {/* Plan Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-primary-600" />
            Plan Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Plan Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.planName}
                onChange={(e) => handleChange('planName', e.target.value)}
                className={`input ${errors.planName ? 'border-red-500' : ''}`}
                placeholder="Enterprise 100Mbps"
              />
              {errors.planName && <p className="text-sm text-red-500 mt-1">{errors.planName}</p>}
            </div>
            <div>
              <label className="label">Bandwidth <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.bandwidth}
                onChange={(e) => handleChange('bandwidth', e.target.value)}
                className={`input ${errors.bandwidth ? 'border-red-500' : ''}`}
                placeholder="100 Mbps"
              />
              {errors.bandwidth && <p className="text-sm text-red-500 mt-1">{errors.bandwidth}</p>}
            </div>
            <div>
              <label className="label">Connection Type</label>
              <select
                value={formData.connectionType}
                onChange={(e) => handleChange('connectionType', e.target.value)}
                className="input"
              >
                <option value="">Select Type</option>
                {Object.entries(ConnectionType).map(([key, value]) => (
                  <option key={key} value={value}>{ConnectionTypeLabels[value as ConnectionType]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Circuit ID</label>
              <input
                type="text"
                value={formData.circuitId}
                onChange={(e) => handleChange('circuitId', e.target.value)}
                className="input"
                placeholder="SL-FBR-CHN-001"
              />
            </div>
          </div>
        </div>

        {/* Billing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" />
            Billing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">MRC (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.mrc}
                onChange={(e) => handleChange('mrc', e.target.value)}
                className={`input ${errors.mrc ? 'border-red-500' : ''}`}
                placeholder="25000"
              />
              {errors.mrc && <p className="text-sm text-red-500 mt-1">{errors.mrc}</p>}
            </div>
            <div>
              <label className="label">OTC (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.otc}
                onChange={(e) => handleChange('otc', e.target.value)}
                className={`input ${errors.otc ? 'border-red-500' : ''}`}
                placeholder="15000"
              />
              {errors.otc && <p className="text-sm text-red-500 mt-1">{errors.otc}</p>}
            </div>
            <div>
              <label className="label">Static IP Charge (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.staticIpCharge}
                onChange={(e) => handleChange('staticIpCharge', e.target.value)}
                className={`input ${errors.staticIpCharge ? 'border-red-500' : ''}`}
                placeholder="2000"
              />
              {errors.staticIpCharge && <p className="text-sm text-red-500 mt-1">{errors.staticIpCharge}</p>}
            </div>
            <div>
              <label className="label">Static IP Count</label>
              <input
                type="number"
                value={formData.staticIpCount}
                onChange={(e) => handleChange('staticIpCount', parseInt(e.target.value) || 0)}
                className="input"
                placeholder="4"
                min={0}
              />
            </div>
            <div>
              <label className="label">Other Charges (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.otherCharges}
                onChange={(e) => handleChange('otherCharges', e.target.value)}
                className={`input ${errors.otherCharges ? 'border-red-500' : ''}`}
                placeholder="500"
              />
              {errors.otherCharges && <p className="text-sm text-red-500 mt-1">{errors.otherCharges}</p>}
            </div>
          </div>
        </div>

        {/* Installation Address Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Installation Address
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Address <span className="text-red-500">*</span></label>
              <textarea
                value={formData.installationAddress}
                onChange={(e) => handleChange('installationAddress', e.target.value)}
                className={`input ${errors.installationAddress ? 'border-red-500' : ''}`}
                rows={2}
                placeholder="Street address, building, floor"
              />
              {errors.installationAddress && <p className="text-sm text-red-500 mt-1">{errors.installationAddress}</p>}
            </div>
            <div>
              <label className="label">City <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.installationCity}
                onChange={(e) => handleChange('installationCity', e.target.value)}
                className={`input ${errors.installationCity ? 'border-red-500' : ''}`}
                placeholder="Chennai"
              />
              {errors.installationCity && <p className="text-sm text-red-500 mt-1">{errors.installationCity}</p>}
            </div>
            <div>
              <label className="label">State <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.installationState}
                onChange={(e) => handleChange('installationState', e.target.value)}
                className={`input ${errors.installationState ? 'border-red-500' : ''}`}
                placeholder="Tamil Nadu"
              />
              {errors.installationState && <p className="text-sm text-red-500 mt-1">{errors.installationState}</p>}
            </div>
            <div>
              <label className="label">Pincode <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.installationPincode}
                onChange={(e) => handleChange('installationPincode', e.target.value)}
                className={`input ${errors.installationPincode ? 'border-red-500' : ''}`}
                placeholder="600001"
                maxLength={6}
              />
              {errors.installationPincode && <p className="text-sm text-red-500 mt-1">{errors.installationPincode}</p>}
            </div>
          </div>
        </div>

        {/* Coordinates Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-600" />
            Map Coordinates
          </h3>
          <CoordinatePicker
            latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
            longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
            onSelect={handleCoordinateSelect}
          />
        </div>

        {/* Dates Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Important Dates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Provisioned At</label>
              <input
                type="date"
                value={formData.provisionedAt}
                onChange={(e) => handleChange('provisionedAt', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Renewal Date</label>
              <input
                type="date"
                value={formData.renewalDate}
                onChange={(e) => handleChange('renewalDate', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary-600" />
            Notes
          </h3>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="input"
            rows={3}
            placeholder="Any additional notes about this site..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-secondary">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Site
          </button>
        </div>
      </form>
    </Modal>
  );
}