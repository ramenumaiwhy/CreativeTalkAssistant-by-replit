import { v4 as uuidv4 } from "uuid";
import { Conversation, Context, Message } from "@/types";

export interface IStorage {
  getUser(id: number): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Conversation methods
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: Conversation): Promise<Conversation>;
  updateConversation(conversation: Conversation): Promise<Conversation>;
  deleteConversation(id: string): Promise<boolean>;
  
  // Message methods
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: Message): Promise<Message>;
  
  // Line user methods
  getLineUser(lineId: string): Promise<any | undefined>;
  createLineUser(lineId: string, data: any): Promise<any>;
  updateLineUser(lineId: string, data: any): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private conversations: Map<string, Conversation>;
  private lineUsers: Map<string, any>;
  private currentUserId: number;
  
  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.lineUsers = new Map();
    this.currentUserId = 1;
  }
  
  async getUser(id: number): Promise<any | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(user: any): Promise<any> {
    const id = this.currentUserId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Conversation methods
  async getConversations(): Promise<Conversation[]> {
    const conversations = Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    console.log(`Debug - getConversations: Found ${conversations.length} conversations`);
    console.log(`Debug - Conversations Map size: ${this.conversations.size}`);
    if (this.conversations.size > 0) {
      console.log(`Debug - First conversation ID: ${conversations[0]?.id}`);
    }
    return conversations;
  }
  
  async getConversation(id: string): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    console.log(`Debug - getConversation: Requested ID ${id}, Found: ${conversation ? 'Yes' : 'No'}`);
    return conversation;
  }
  
  async createConversation(conversation: Conversation): Promise<Conversation> {
    console.log(`Debug - createConversation: Creating conversation with ID ${conversation.id}`);
    this.conversations.set(conversation.id, conversation);
    console.log(`Debug - After creation, Map size: ${this.conversations.size}`);
    return conversation;
  }
  
  async updateConversation(conversation: Conversation): Promise<Conversation> {
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }
  
  async deleteConversation(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }
  
  // Message methods
  async getMessages(conversationId: string): Promise<Message[]> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];
    return conversation.messages;
  }
  
  async createMessage(message: Message): Promise<Message> {
    const conversation = this.conversations.get(message.conversationId);
    if (!conversation) {
      throw new Error("会話が見つかりませんでした");
    }
    
    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    this.conversations.set(conversation.id, conversation);
    
    return message;
  }
  
  // Line user methods
  async getLineUser(lineId: string): Promise<any | undefined> {
    return this.lineUsers.get(lineId);
  }
  
  async createLineUser(lineId: string, data: any): Promise<any> {
    const user = {
      lineId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.lineUsers.set(lineId, user);
    return user;
  }
  
  async updateLineUser(lineId: string, data: any): Promise<any> {
    const user = this.lineUsers.get(lineId);
    if (!user) {
      throw new Error("LINEユーザーが見つかりませんでした");
    }
    
    const updatedUser = {
      ...user,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    this.lineUsers.set(lineId, updatedUser);
    return updatedUser;
  }
}

export const storage = new MemStorage();
