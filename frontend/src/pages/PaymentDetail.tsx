import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CreditCard,
  Calendar,
  Hash,
  User,
  Building2,
  FileText,
  DollarSign,
  MapPin,
} from 'lucide-react';
import { clsx } from 'clsx';
import { paymentApi } from '@/api/endpoints';
import Modal from '@/components/common/Modal';
import type { Payment } from '@/types/models';
import { PaymentType } from '@/types/enums';
import { toast } from 'sonner';

const paymentTypeLabels: Record<string, string> = {
  OTC: 'OTC',
  MRC: 'MRC',
  STATIC_IP: 'Static IP',
  OTHER: 'Other',
};

const paymentTypeColors: Record<string, string> = {
  OTC: 'bg-blue-100 text-blue-800',
  MRC: 'bg-green-100 text-green-800',
  STATIC_IP: 'bg-purple-100 text-purple-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentApi.get(id!),
    enabled: !!id,
  });

  const payment = data?.data?.data;

  const handleDelete = async () => {
    if (!payment) return;
    try {
      await paymentApi.delete(payment.id);
      toast.success('Payment deleted successfully');
      navigate('/payments');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete payment';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Payment not found</h2>
          <Link to="/payments" className="btn btn-primary mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Link>
        </div>
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
        <div className="flex items-center gap-3">
          <Link to={`/payments/${payment.id}/edit`} className="btn btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
          <button onClick={() => setDeleteModalOpen(true)} className="btn btn-danger">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{payment.paymentNumber}</h1>
              <p className="text-gray-600 mt-1">
                {paymentTypeLabels[payment.type] || payment.type} • ₹{Number(payment.amount).toLocaleString()} • {new Date(payment.paymentDate).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={clsx('badge', paymentTypeColors[payment.type] || 'bg-gray-100 text-gray-800')}>
                {paymentTypeLabels[payment.type] || payment.type}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Payment Number</p>
              <p className="font-mono text-lg font-medium text-gray-900">{payment.paymentNumber}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Amount</p>
              <p className="font-mono text-lg font-medium text-primary-600">₹{Number(payment.amount).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Payment Date</p>
              <p className="font-medium text-gray-900">{new Date(payment.paymentDate).toLocaleDateString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Type</p>
              <span className={clsx('badge', paymentTypeColors[payment.type] || 'bg-gray-100 text-gray-800')}>
                {paymentTypeLabels[payment.type] || payment.type}
              </span>
            </div>
          </div>

          {/* Customer & Site */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-400" />
                Customer
              </h3>
              <div className="space-y-2 text-gray-600">
                <p className="font-medium text-gray-900">{payment.customer?.companyName}</p>
                <p>{payment.customer?.customerCode}</p>
                <p>{payment.customer?.contactPerson}</p>
                <p>{payment.customer?.email}</p>
                <p>{payment.customer?.phone}</p>
                <p>{payment.customer?.city}, {payment.customer?.state} {payment.customer?.pincode}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" />
                Site
              </h3>
              {payment.site ? (
                <div className="space-y-2 text-gray-600">
                  <p className="font-medium text-gray-900">{payment.site.siteCode}</p>
                  <p>{payment.site.planName}</p>
                  <p>{payment.site.bandwidth}</p>
                  <p>{payment.site.installationCity}, {payment.site.installationState}</p>
                </div>
              ) : (
                <p className="text-gray-500">No site linked</p>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Payment Details
              </h3>
              <div className="space-y-2 text-gray-600">
                {payment.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method:</span>
                    <span className="font-medium">{payment.paymentMethod}</span>
                  </div>
                )}
                {payment.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Transaction ID:</span>
                    <span className="font-mono text-sm">{payment.transactionId}</span>
                  </div>
                )}
                {payment.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reference #:</span>
                    <span className="font-mono text-sm">{payment.referenceNumber}</span>
                  </div>
                )}
                {payment.invoiceNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Invoice #:</span>
                    <span className="font-mono text-sm">{payment.invoiceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Recorded By:</span>
                  <span className="font-medium">{payment.recordedBy?.firstName} {payment.recordedBy?.lastName}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                Timestamps
              </h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span>{new Date(payment.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Updated:</span>
                  <span>{new Date(payment.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Notes */}
          {(payment.description || payment.notes) && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description & Notes</h3>
              <div className="prose prose-sm max-w-none text-gray-600">
                {payment.description && (
                  <div className="mb-4">
                    <p className="font-medium text-gray-500 mb-1">Description</p>
                    <p className="whitespace-pre-wrap">{payment.description}</p>
                  </div>
                )}
                {payment.notes && (
                  <div>
                    <p className="font-medium text-gray-500 mb-1">Notes</p>
                    <p className="whitespace-pre-wrap">{payment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteModalOpen && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Payment">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete payment <strong>{payment.paymentNumber}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn btn-danger">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}