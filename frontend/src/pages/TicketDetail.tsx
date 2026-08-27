import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  Edit,
  Trash2,
  User,
  Bot,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  X,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ticketApi } from '@/api/endpoints';
import StatusBadge from '@/components/common/StatusBadge';
import Modal from '@/components/common/Modal';
import type { Ticket, TicketMessage, User as UserModel } from '@/types/models';
import {
  TicketStatus,
  TicketStatusLabels,
  TicketPriority,
  TicketPriorityLabels,
  TicketSource,
  TicketSourceLabels,
} from '@/types/enums';
import { toast } from 'sonner';

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messageEndRef = useRef<HTMLDivElement>(null);

  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const { data: ticketData, isLoading: ticketLoading, error: ticketError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketApi.get(id!),
    enabled: !!id,
  });

  const ticket = ticketData?.data?.data;

  const sendMessageMutation = useMutation({
    mutationFn: (data: { message: string; isInternal: boolean }) =>
      ticketApi.addMessage(id!, data),
    onSuccess: () => {
      setReplyText('');
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Reply sent');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => ticketApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Status updated');
      setStatusModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => ticketApi.delete(id!),
    onSuccess: () => {
      toast.success('Ticket deleted');
      navigate('/tickets');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete ticket');
    },
  });

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  if (ticketLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Ticket not found</h2>
          <Link to="/tickets" className="btn btn-primary mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Link>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!replyText.trim()) return;
    sendMessageMutation.mutate({ message: replyText, isInternal });
  };

  const handleStatusChange = (status: string) => {
    statusMutation.mutate(status);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const messages = ticket.messages || [];
  const canReply = ticket.status !== 'CLOSED';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/tickets" className="btn btn-secondary gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => setStatusModalOpen(true)} className="btn btn-secondary">
            <Clock className="w-4 h-4 mr-2" />
            Update Status
          </button>
          <Link to={`/tickets/${ticket.id}/edit`} className="btn btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
          <button onClick={() => setDeleteModalOpen(true)} className="btn btn-danger">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
                <p className="text-gray-600 mt-1 font-mono text-sm">{ticket.ticketNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge type="ticket-status" value={ticket.status} />
                <StatusBadge type="ticket-priority" value={ticket.priority} />
                <StatusBadge type="ticket-source" value={ticket.source} />
              </div>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-500" />
              Conversation ({messages.length})
            </h2>

            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No messages yet</p>
                </div>
              )}

              {messages.map((message: TicketMessage) => (
                <div
                  key={message.id}
                  className={clsx(
                    'flex gap-3',
                    message.isInternal && 'opacity-75'
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.isInternal ? 'bg-yellow-100' : 'bg-primary-100'
                  )}>
                    {message.isInternal ? (
                      <Shield className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <User className="w-4 h-4 text-primary-600" />
                    )}
                  </div>
                  <div className={clsx(
                    'flex-1 rounded-lg p-3',
                    message.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {message.user ? `${message.user.firstName} ${message.user.lastName}` : 'System'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                    {message.isInternal && (
                      <span className="text-xs text-yellow-600 font-medium mt-1 inline-block">🔒 Internal Note</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>

            {/* Reply Box */}
            {canReply ? (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      rows={3}
                      className="input resize-none"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={e => setIsInternal(e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        Internal note (not visible to customer)
                      </label>
                      <button
                        onClick={handleSend}
                        disabled={!replyText.trim() || sendMessageMutation.isPending}
                        className="btn btn-primary"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendMessageMutation.isPending ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-gray-200 pt-6 text-center text-gray-500">
                <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                <p>This ticket is closed. Reopen to reply.</p>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-medium text-gray-900">{ticket.customer?.companyName || '-'}</p>
                </div>
              </div>
              {ticket.site && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Site</p>
                    <p className="font-medium text-gray-900">{ticket.site.siteCode}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Assigned To</p>
                  <p className="font-medium text-gray-900">
                    {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {ticket.slaDueAt && (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">SLA Due</p>
                    <p className="font-medium text-gray-900">{new Date(ticket.slaDueAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {ticket.description && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Modal */}
      {statusModalOpen && (
        <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Update Ticket Status">
          <div className="space-y-3">
            {Object.values(TicketStatus).map(status => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={clsx(
                  'w-full text-left px-4 py-3 rounded-lg border transition-colors',
                  ticket.status === status
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{TicketStatusLabels[status]}</span>
                  <StatusBadge type="ticket-status" value={status} />
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Ticket">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{ticket.ticketNumber}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}