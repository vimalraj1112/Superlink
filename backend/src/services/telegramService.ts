import { env } from '@/config/env';
import { prisma } from '@/config/db';
import { emitChatNewSession, emitChatMessage, emitTicketCreated } from './socketService';

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    type: 'private' | 'group' | 'supergroup' | 'channel';
  };
  date: number;
  text?: string;
  caption?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    file_size: number;
    width: number;
    height: number;
  }>;
  document?: {
    file_id: string;
    file_unique_id: string;
    file_size: number;
    file_name?: string;
    mime_type?: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: any;
}

interface TelegramApiResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

/**
 * Telegram Bot Service
 * Handles incoming webhook messages and outbound API calls
 */
export class TelegramService {
  private botToken: string;
  private baseUrl: string;

  constructor() {
    this.botToken = env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Check if bot is configured
   */
  isConfigured(): boolean {
    return !!this.botToken;
  }

  /**
   * Process incoming webhook update
   */
  async processUpdate(update: TelegramUpdate): Promise<void> {
    if (!update.message) {
      // Handle callback queries, edited messages, etc. if needed
      return;
    }

    const message = update.message;
    const chat = message.chat;
    const from = message.from;

    // Only process private messages for now
    if (chat.type !== 'private') {
      return;
    }

    const platformUserId = String(from.id);
    const platformChatId = String(chat.id);

    // Get or create chat session
    const session = await this.getOrCreateSession(platformUserId, platformChatId, from);

    // Save incoming message to ChatMessage
    const chatMessage = await this.saveIncomingMessage(session.id, message);

    // Find or create ticket for this session
    let ticket = await this.findOrCreateTicket(session, message);

    // Create ticket message linked to chat message
    if (ticket) {
      await this.createTicketMessage(ticket.id, session.id, chatMessage.id, message);
    }

    // Send auto-reply
    await this.sendAutoReply(chat.id, ticket?.ticketNumber);
  }

  /**
   * Get or create chat session for Telegram user
   */
  private async getOrCreateSession(
    platformUserId: string,
    platformChatId: string,
    from: TelegramUser
  ) {
    let session = await prisma.chatSession.findUnique({
      where: {
        platform_platformUserId: {
          platform: 'TELEGRAM',
          platformUserId,
        },
      },
    });

    if (!session) {
      // Try to find existing customer by Telegram info
      let customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: { contains: from.username || '' } },
            { email: { contains: from.username || '' } },
          ],
        },
      });

      // If no customer found, create a placeholder or use a default
      if (!customer) {
        // Create a generic customer for unknown Telegram users
        // In production, you'd want a registration flow
        customer = await prisma.customer.create({
          data: {
            customerCode: `TG-${from.id}`,
            companyName: `Telegram User ${from.first_name} ${from.last_name || ''}`.trim(),
            contactPerson: `${from.first_name} ${from.last_name || ''}`.trim(),
            email: from.username ? `${from.username}@telegram.local` : `tg_${from.id}@telegram.local`,
            phone: `+${from.id}`,
            address: 'Telegram User',
            city: 'Unknown',
            state: 'Unknown',
            pincode: '000000',
            isActive: true,
            createdById: (await this.getSystemUser()).id,
          },
        });
      }

      session = await prisma.chatSession.create({
        data: {
          platform: 'TELEGRAM',
          platformUserId,
          platformChatId,
          customerId: customer.id,
          isActive: true,
          lastMessageAt: new Date(),
        },
      });

      // Emit new session event for real-time alerts
      emitChatNewSession(session);
    } else {
      // Update last message time
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { lastMessageAt: new Date(), isActive: true },
      });
    }

    return session;
  }

  /**
   * Get or create system user for automated actions
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
   * Save incoming message to ChatMessage
   */
  private async saveIncomingMessage(sessionId: string, message: TelegramMessage) {
    const content = message.text || message.caption || '[Media]';

    return await prisma.chatMessage.create({
      data: {
        sessionId,
        platform: 'TELEGRAM',
        platformMessageId: String(message.message_id),
        direction: 'inbound',
        content,
        messageType: message.photo ? 'photo' : message.document ? 'document' : 'text',
        metadata: {
          messageId: message.message_id,
          from: message.from,
          chat: message.chat,
        },
      },
    });
  }

  /**
   * Find or create ticket for the session
   */
  private async findOrCreateTicket(session: any, message: TelegramMessage) {
    // Check if there's an active ticket for this session
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
      // Create new ticket from Telegram message
      const content = message.text || message.caption || 'Telegram inquiry';

      ticket = await prisma.ticket.create({
        data: {
          ticketNumber: await this.generateTicketNumber(),
          title: content.substring(0, 255),
          description: content,
          status: 'OPEN',
          priority: 'MEDIUM',
          source: 'TELEGRAM',
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
          message: `Ticket created from Telegram message by ${message.from.first_name} ${message.from.last_name || ''}`,
          isInternal: true,
        },
      });

      // Emit real-time event for new ticket
      emitTicketCreated(ticket);
    }

    return ticket;
  }

  /**
   * Create ticket message linked to chat message
   */
  private async createTicketMessage(ticketId: string, sessionId: string, chatMessageId: string, message: TelegramMessage) {
    const content = message.text || message.caption || '[Media]';

    return await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: (await this.getSystemUser()).id,
        message: `[Telegram] ${content}`,
        isInternal: false,
        chatMessage: { connect: { id: chatMessageId } },
      },
    });
  }

  /**
   * Send auto-reply to Telegram user
   */
  private async sendAutoReply(chatId: number, ticketNumber?: string) {
    if (!this.isConfigured()) return;

    const text = ticketNumber
      ? `Thank you for contacting SuperLink IT Support. Your ticket has been created: ${ticketNumber}. Our team will respond shortly.`
      : 'Thank you for contacting SuperLink IT Support. Our team will respond shortly.';

    await this.sendMessage(chatId, text);
  }

  /**
   * Send message via Telegram Bot API
   */
  async sendMessage(chatId: number | string, text: string, options?: { parse_mode?: string; reply_markup?: any }): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parse_mode || 'HTML',
          reply_markup: options?.reply_markup,
        }),
      });

      const result = (await response.json()) as TelegramApiResponse;
      return result.ok === true;
    } catch (error) {
      console.error('Telegram sendMessage error:', error);
      return false;
    }
  }

  /**
   * Send message from agent reply to Telegram user
   */
  async sendAgentReply(platformChatId: string, text: string): Promise<boolean> {
    return this.sendMessage(platformChatId, text);
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
   * Set webhook URL
   */
  async setWebhook(url: string): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result = (await response.json()) as TelegramApiResponse;
      return result.ok === true;
    } catch (error) {
      console.error('Telegram setWebhook error:', error);
      return false;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
        method: 'POST',
      });

      const result = (await response.json()) as TelegramApiResponse;
      return result.ok === true;
    } catch (error) {
      console.error('Telegram deleteWebhook error:', error);
      return false;
    }
  }

  /**
   * Get bot info
   */
  async getMe(): Promise<any> {
    if (!this.isConfigured()) return null;

    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const result = (await response.json()) as TelegramApiResponse;
      return result.ok ? result.result : null;
    } catch (error) {
      console.error('Telegram getMe error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const telegramService = new TelegramService();