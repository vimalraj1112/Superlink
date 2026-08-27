import { prisma } from '@/config/db';
import { telegramService } from './telegramService';
import { emitChatMessage, emitTicketMessage, emitNotificationToUser } from './socketService';
import { encrypt } from './encryptionService';

interface ChatPlatformMessage {
  platform: 'TELEGRAM' | 'WHATSAPP';
  platformUserId: string;
  platformChatId: string;
  platformMessageId: string;
  direction: 'inbound' | 'outbound';
  content: string;
  messageType: 'text' | 'photo' | 'document' | 'audio' | 'video' | 'location' | 'contact';
  metadata?: Record<string, any>;
  senderInfo?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    phoneNumber?: string;
  };
}

interface ProcessedMessageResult {
  session: any;
  ticket?: any;
  chatMessage: any;
  ticketMessage?: any;
}

interface AgentReplyOptions {
  ticketId: string;
  sessionId: string;
  message: string;
  isInternal?: boolean;
  userId: string;
}

/**
 * Unified Chat Agent Service
 * Handles both Telegram and WhatsApp message processing
 * Provides single interface for chat-to-ticket flow
 */
export class ChatAgentService {
  /**
   * Process incoming message from any platform (Telegram/WhatsApp)
   */
  async processInboundMessage(message: ChatPlatformMessage): Promise<ProcessedMessageResult> {
    // Get or create chat session
    const session = await this.getOrCreateSession(message);

    // Save chat message
    const chatMessage = await this.saveChatMessage(session.id, message);

    // Find or create ticket
    let ticket = await this.findOrCreateTicket(session, message);

    // Create ticket message if ticket exists
    let ticketMessage: any = null;
    if (ticket) {
      ticketMessage = await this.createTicketMessage(
        ticket.id,
        session.id,
        chatMessage.id,
        message,
        message.direction === 'inbound' ? (await this.getSystemUser()).id : message.metadata?.userId
      );
    }

    // Emit real-time events
    emitChatMessage(session.id, chatMessage);
    if (ticketMessage) {
      emitTicketMessage(ticket!.id, ticketMessage);
    }

    return { session, ticket, chatMessage, ticketMessage };
  }

  /**
   * Get or create chat session for platform user
   */
  private async getOrCreateSession(message: ChatPlatformMessage) {
    let session = await prisma.chatSession.findUnique({
      where: {
        platform_platformUserId: {
          platform: message.platform,
          platformUserId: message.platformUserId,
        },
      },
    });

    if (!session) {
      // Try to find existing customer by platform info
      let customer = await this.findCustomerByPlatformInfo(message);

      // If no customer found, create a placeholder
      if (!customer) {
        customer = await this.createCustomerFromPlatformInfo(message);
      }

      session = await prisma.chatSession.create({
        data: {
          platform: message.platform,
          platformUserId: message.platformUserId,
          platformChatId: message.platformChatId,
          customerId: customer.id,
          isActive: true,
          lastMessageAt: new Date(),
        },
      });

      // Emit new session event
      const { emitChatNewSession } = await import('./socketService.js');
      emitChatNewSession(session);
    } else {
      // Update session
      await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          lastMessageAt: new Date(),
          isActive: true,
          platformChatId: message.platformChatId, // Update in case chat ID changed
        },
      });
    }

    return session;
  }

  /**
   * Find customer by platform information
   */
  private async findCustomerByPlatformInfo(message: ChatPlatformMessage) {
    const searchTerms: string[] = [];

    if (message.senderInfo?.phoneNumber) {
      searchTerms.push(message.senderInfo.phoneNumber);
    }
    if (message.senderInfo?.username) {
      searchTerms.push(message.senderInfo.username);
    }
    if (message.senderInfo?.firstName && message.senderInfo?.lastName) {
      searchTerms.push(`${message.senderInfo.firstName} ${message.senderInfo.lastName}`);
    }

    if (searchTerms.length === 0) return null;

    return await prisma.customer.findFirst({
      where: {
        OR: searchTerms.map(term => ({
          OR: [
            { phone: { contains: term } },
            { email: { contains: term } },
            { contactPerson: { contains: term } },
            { companyName: { contains: term } },
          ],
        })),
      },
    });
  }

  /**
   * Create customer from platform information
   */
  private async createCustomerFromPlatformInfo(message: ChatPlatformMessage) {
    const platformPrefix = message.platform === 'TELEGRAM' ? 'TG' : 'WA';
    const identifier = message.senderInfo?.username
      ? message.senderInfo.username
      : message.platformUserId;

    const systemUser = await this.getSystemUser();

    return await prisma.customer.create({
      data: {
        customerCode: `${platformPrefix}-${identifier}`,
        companyName:
          message.senderInfo?.firstName || message.senderInfo?.username
            ? `${message.senderInfo?.firstName || ''} ${message.senderInfo?.lastName || ''}`.trim()
            : `${platformPrefix} User ${message.platformUserId}`,
        contactPerson:
          message.senderInfo?.firstName || message.senderInfo?.username
            ? `${message.senderInfo?.firstName || ''} ${message.senderInfo?.lastName || ''}`.trim()
            : `${platformPrefix} User ${message.platformUserId}`,
        email: message.senderInfo?.username
          ? `${message.senderInfo.username}@${message.platform.toLowerCase()}.local`
          : `${platformPrefix.toLowerCase()}_${message.platformUserId}@${message.platform.toLowerCase()}.local`,
        phone: message.senderInfo?.phoneNumber || `+${message.platformUserId}`,
        address: `${message.platform} User`,
        city: 'Unknown',
        state: 'Unknown',
        pincode: '000000',
        isActive: true,
        createdById: systemUser.id,
      },
    });
  }

  /**
   * Find or create ticket for session
   */
  private async findOrCreateTicket(session: any, message: ChatPlatformMessage) {
    // Check for active ticket
    let ticket = await prisma.ticket.findFirst({
      where: {
        chatSessions: {
          some: { id: session.id },
        },
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!ticket) {
      // Create new ticket
      const content = message.content || `${message.platform} inquiry`;
      const title = content.substring(0, 255);

      ticket = await prisma.ticket.create({
        data: {
          ticketNumber: await this.generateTicketNumber(),
          title,
          description: content,
          status: 'OPEN',
          priority: this.determinePriority(message),
          source: message.platform === 'TELEGRAM' ? 'TELEGRAM' : 'WHATSAPP',
          customerId: session.customerId,
          createdById: (await this.getSystemUser()).id,
        },
      });

      // Link session to ticket
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { ticketId: ticket.id },
      });

      // Add initial system message
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          userId: (await this.getSystemUser()).id,
          message: `Ticket created from ${message.platform} message by ${message.senderInfo?.firstName || 'Unknown'} ${message.senderInfo?.lastName || ''}`,
          isInternal: true,
        },
      });

      // Emit real-time event for new ticket
      const { emitTicketCreated } = await import('./socketService.js');
      emitTicketCreated(ticket);
    }

    return ticket;
  }

  /**
   * Determine ticket priority based on message content
   */
  private determinePriority(message: ChatPlatformMessage): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    const content = message.content.toLowerCase();

    // Urgent keywords
    if (
      content.includes('urgent') ||
      content.includes('emergency') ||
      content.includes('down') ||
      content.includes('outage') ||
      content.includes('critical') ||
      content.includes('not working') ||
      content.includes('completely down')
    ) {
      return 'URGENT';
    }

    // High priority keywords
    if (
      content.includes('slow') ||
      content.includes('intermittent') ||
      content.includes('issue') ||
      content.includes('problem') ||
      content.includes('error') ||
      content.includes('fail')
    ) {
      return 'HIGH';
    }

    // Low priority keywords
    if (
      content.includes('query') ||
      content.includes('question') ||
      content.includes('info') ||
      content.includes('information') ||
      content.includes('billing') ||
      content.includes('invoice')
    ) {
      return 'LOW';
    }

    return 'MEDIUM';
  }

  /**
   * Save chat message to database
   */
  private async saveChatMessage(sessionId: string, message: ChatPlatformMessage) {
    return await prisma.chatMessage.create({
      data: {
        sessionId,
        platform: message.platform,
        platformMessageId: message.platformMessageId,
        direction: message.direction,
        content: message.content,
        messageType: message.messageType,
        metadata: message.metadata,
      },
    });
  }

  /**
   * Create ticket message linked to chat message
   */
  private async createTicketMessage(
    ticketId: string,
    sessionId: string,
    chatMessageId: string,
    message: ChatPlatformMessage,
    userId: string
  ) {
    const prefix = message.direction === 'inbound' ? `[${message.platform}]` : '[Agent Reply]';

    return await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        message: `${prefix} ${message.content}`,
        isInternal: message.direction === 'inbound' ? false : message.metadata?.isInternal || false,
        chatMessage: { connect: { id: chatMessageId } },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Send agent reply from CRM to platform user
   */
  async sendAgentReply(options: AgentReplyOptions): Promise<boolean> {
    const { ticketId, sessionId, message, isInternal = false, userId } = options;

    // Get session with platform info
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { customer: true },
    });

    if (!session) {
      throw new Error('Chat session not found');
    }

    // Save agent reply as chat message (outbound)
    const chatMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        platform: session.platform,
        platformMessageId: `agent_${Date.now()}`,
        direction: 'outbound',
        content: message,
        messageType: 'text',
        metadata: { userId, isInternal },
      },
    });

    // Create ticket message
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        message: `[Agent Reply] ${message}`,
        isInternal,
        chatMessage: { connect: { id: chatMessage.id } },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Send to platform
    let sent = false;
    if (!isInternal) {
      if (session.platform === 'TELEGRAM') {
        sent = await telegramService.sendAgentReply(session.platformChatId || '', message);
      } else if (session.platform === 'WHATSAPP') {
        // Will be implemented when WhatsApp service is ready
        sent = await this.sendWhatsAppReply(session.platformChatId || '', message);
      }
    }

    // Update chat message with send status
    await prisma.chatMessage.update({
      where: { id: chatMessage.id },
      data: { metadata: { ...(chatMessage.metadata as Record<string, any> || {}), sent, sentAt: new Date().toISOString() } },
    });

    // Emit real-time events
    emitChatMessage(sessionId, chatMessage);
    emitTicketMessage(ticketId, ticketMessage);

    // Notify assigned user if not internal
    if (!isInternal && ticketMessage.user) {
      emitNotificationToUser(ticketMessage.user.id, {
        type: 'ticket_message',
        title: 'Message Sent',
        message: `Your reply has been sent to the customer`,
        data: { ticketId, messageId: ticketMessage.id },
      });
    }

    return sent;
  }

  /**
   * Send WhatsApp reply (placeholder for Phase 5)
   */
  private async sendWhatsAppReply(platformChatId: string, message: string): Promise<boolean> {
    // TODO: Implement when WhatsApp Cloud API is approved
    // Will use Meta WhatsApp Business Cloud API
    console.log(`[WhatsApp] Would send to ${platformChatId}: ${message}`);
    return false;
  }

  /**
   * Get system user for automated actions
   */
  private async getSystemUser() {
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@superlinkit.com' },
    });

    if (!systemUser) {
      const superAdminRole = await prisma.role.findUnique({
        where: { name: 'SUPER_ADMIN' },
      });

      systemUser = await prisma.user.create({
        data: {
          email: 'system@superlinkit.com',
          passwordHash: 'system',
          firstName: 'System',
          lastName: 'Bot',
          roleId: superAdminRole!.id,
          isActive: true,
        },
      });
    }

    return systemUser;
  }

  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const count = await prisma.ticket.count();
    const year = new Date().getFullYear();
    return `TKT-${year}${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Get chat session with ticket and customer info
   */
  async getSessionWithDetails(sessionId: string) {
    return await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        customer: {
          select: { id: true, customerCode: true, companyName: true, contactPerson: true, phone: true, email: true },
        },
        ticket: {
          select: { id: true, ticketNumber: true, title: true, status: true, priority: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  /**
   * Get all active chat sessions for dashboard
   */
  async getActiveSessions(filters?: { platform?: 'TELEGRAM' | 'WHATSAPP'; customerId?: string }) {
    return await prisma.chatSession.findMany({
      where: {
        isActive: true,
        ...(filters?.platform && { platform: filters.platform }),
        ...(filters?.customerId && { customerId: filters.customerId }),
      },
      include: {
        customer: {
          select: { id: true, customerCode: true, companyName: true, contactPerson: true },
        },
        ticket: {
          select: { id: true, ticketNumber: true, title: true, status: true, priority: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  /**
   * Close chat session (mark as inactive)
   */
  async closeSession(sessionId: string, userId: string) {
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    // Add system message to ticket if exists
    if (session.ticketId) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: session.ticketId,
          userId,
          message: 'Chat session closed by agent',
          isInternal: true,
        },
      });
    }

    return session;
  }

  /**
   * Reopen chat session
   */
  async reopenSession(sessionId: string) {
    return await prisma.chatSession.update({
      where: { id: sessionId },
      data: { isActive: true, lastMessageAt: new Date() },
    });
  }

  /**
   * Transfer session to another agent (create new ticket or reassign)
   */
  async transferSession(sessionId: string, newAssignedToId: string, userId: string) {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { ticket: true },
    });

    if (!session?.ticketId) {
      throw new Error('No active ticket for this session');
    }

    // Reassign ticket
    const ticket = await prisma.ticket.update({
      where: { id: session.ticketId },
      data: {
        assignedTo: { connect: { id: newAssignedToId } },
        updatedBy: { connect: { id: userId } },
      },
      include: { assignedTo: true },
    });

    // Add system message
    await prisma.ticketMessage.create({
      data: {
        ticketId: session.ticketId,
        userId,
        message: `Ticket transferred to ${ticket.assignedTo?.firstName} ${ticket.assignedTo?.lastName}`,
        isInternal: true,
      },
    });

    // Emit events
    const { emitTicketAssigned } = await import('./socketService.js');
    emitTicketAssigned(ticket, ticket.assignedTo);

    return ticket;
  }

  /**
   * Get conversation history for a ticket (both chat and ticket messages)
   */
  async getConversationHistory(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        chatSessions: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            chatMessage: true,
          },
        },
      },
    });

    if (!ticket) return null;

    // Merge chat messages and ticket messages chronologically
    const allMessages: any[] = [];

    for (const session of ticket.chatSessions) {
      for (const msg of session.messages) {
        allMessages.push({
          ...msg,
          type: 'chat',
          sessionId: session.id,
          platform: session.platform,
        });
      }
    }

    for (const msg of ticket.messages) {
      allMessages.push({
        ...msg,
        type: 'ticket',
        isInternal: msg.isInternal,
      });
    }

    // Sort by createdAt
    allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      ticket,
      messages: allMessages,
    };
  }
}

// Export singleton instance
export const chatAgentService = new ChatAgentService();