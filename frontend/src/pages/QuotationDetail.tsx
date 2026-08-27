import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Download, Trash2, FileText, Copy, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { quotationApi } from '@/api/endpoints';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import type { Quotation, QuotationItem } from '@/types/models';
import { toast } from 'sonner';

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationApi.get(id!),
    enabled: !!id,
  });

  const quotation = data?.data;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (quotationId: string) => quotationApi.delete(quotationId),
    onSuccess: () => {
      toast.success('Quotation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/quotations');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete quotation');
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (data: any) => quotationApi.create(data),
    onSuccess: (response) => {
      toast.success('Quotation duplicated successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate(`/quotations/${response.data.data.id}/edit`);
      setDuplicateModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to duplicate quotation');
    },
  });

  const handleDelete = () => {
    if (!quotation) return;
    deleteMutation.mutate(quotation.id);
  };

  const handleDuplicate = () => {
    if (!quotation) return;
    setDuplicateModalOpen(true);
  };

  const confirmDuplicate = () => {
    if (!quotation) return;

    const duplicateData = {
      customerId: quotation.customerId,
      siteId: quotation.siteId,
      title: `${quotation.title} (Copy)`,
      description: quotation.description,
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      totalAmount: quotation.totalAmount,
      terms: quotation.terms,
      notes: quotation.notes,
      items: quotation.items?.map((item: QuotationItem) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        sortOrder: item.sortOrder,
      })) || [],
    };

    duplicateMutation.mutate(duplicateData);
  };

  if (isLoading) {
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

  if (error || !quotation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/quotations')} className="btn btn-ghost btn-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>
        <div className="card p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Quotation Not Found</h2>
          <p className="text-gray-600 mt-2">The quotation you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/quotations')} className="btn btn-primary mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/quotations')} className="btn btn-ghost btn-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
            <p className="text-gray-600 mt-1">{quotation.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge type="custom" value={quotation.status.toLowerCase()} label={quotation.status} />
          <button onClick={() => navigate(`/quotations/${quotation.id}/edit`)} className="btn btn-secondary gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button onClick={() => { setDeleteModalOpen(true); }} className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Quotation Details</h3>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-gray-500">Quotation Number</label>
                  <p className="font-mono text-brand-600">{quotation.quotationNumber}</p>
                </div>
                <div>
                  <label className="label text-gray-500">Status</label>
                  <StatusBadge type="custom" value={quotation.status.toLowerCase()} label={quotation.status} />
                </div>
                <div>
                  <label className="label text-gray-500">Customer</label>
                  <p className="font-medium text-gray-900">{quotation.customer?.companyName || '-'}</p>
                  <p className="text-sm text-gray-500">{quotation.customer?.customerCode || ''}</p>
                </div>
                <div>
                  <label className="label text-gray-500">Site</label>
                  <p className="font-medium text-gray-900">{quotation.site?.siteCode || '-'}</p>
                </div>
                <div>
                  <label className="label text-gray-500">Validity Date</label>
                  <p className="font-medium text-gray-900">{new Date(quotation.validityDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="label text-gray-500">Created By</label>
                  <p className="font-medium text-gray-900">
                    {quotation.createdBy?.firstName} {quotation.createdBy?.lastName}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-gray-500">Description</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{quotation.description || 'No description'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-gray-500">Terms & Conditions</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{quotation.terms || 'No terms specified'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-gray-500">Notes</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{quotation.notes || 'No notes'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Items ({quotation._count?.items || 0})</h3>
            </div>
            <div className="card-body">
              {quotation.items && quotation.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.items.map((item: QuotationItem, index: number) => (
                        <tr key={item.id}>
                          <td className="font-medium">{index + 1}</td>
                          <td>{item.description}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                          <td className="text-right font-medium">₹{item.totalPrice.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No items in this quotation</p>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 text-right">
                  <p className="text-gray-600">Subtotal</p>
                  <p className="text-gray-600">Tax Amount</p>
                  <p className="text-xl font-bold text-gray-900">Total</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900">₹{quotation.subtotal.toLocaleString('en-IN')}</p>
                  <p className="text-gray-900">₹{quotation.taxAmount.toLocaleString('en-IN')}</p>
                  <p className="text-xl font-bold text-brand-600">₹{quotation.totalAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
            <button className="btn btn-primary w-full gap-2" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
              <Edit className="w-4 h-4" />
              Edit Quotation
            </button>
            <button className="btn btn-primary w-full gap-2" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
              <Edit className="w-4 h-4" />
              Edit Quotation
            </button>
            <button className="btn btn-secondary w-full gap-2" onClick={() => toast.info('PDF generation coming soon')}>
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button className="btn btn-outline w-full gap-2" onClick={handleDuplicate} disabled={duplicateMutation.isPending}>
              <FileText className="w-4 h-4" />
              {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
            </button>
            <button onClick={() => { setDeleteModalOpen(true); }} className="btn btn-danger w-full gap-2" disabled={deleteMutation.isPending}>
              <Trash2 className="w-4 h-4" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Quotation'}
            </button>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>
            <div className="space-y-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 bg-brand-600 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">{new Date(quotation.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {quotation.sentAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 bg-green-600 rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Sent to Customer</p>
                    <p className="text-xs text-gray-500">{new Date(quotation.sentAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {quotation.acceptedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Accepted</p>
                    <p className="text-xs text-gray-500">{new Date(quotation.acceptedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {deleteModalOpen && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Quotation">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{quotation.quotationNumber}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn btn-danger" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      {duplicateModalOpen && (
        <Modal isOpen={duplicateModalOpen} onClose={() => setDuplicateModalOpen(false)} title="Duplicate Quotation">
          <p className="text-gray-600 mb-6">
            Create a copy of <strong>{quotation.quotationNumber}</strong> with a new validity date?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDuplicateModalOpen(false)} className="btn-secondary" disabled={duplicateMutation.isPending}>Cancel</button>
            <button onClick={confirmDuplicate} className="btn btn-primary" disabled={duplicateMutation.isPending}>
              {duplicateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Duplicating...
                </>
              ) : (
                'Duplicate'
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

