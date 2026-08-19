import { CollaborationSession, EditLog, Comment } from '../types-extended';
import { hybridStorage } from './hybridStorageService';

class RealtimeCollaborationService {
  private sessions: Map<string, CollaborationSession> = new Map();
  private editBuffer: Map<string, EditLog[]> = new Map();

  async startSession(portfolioId: string, userId: string): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: `collab-${Date.now()}`,
      portfolioId,
      participants: [{
        userId,
        email: '',
        joinedAt: new Date(),
        cursorPosition: { x: 0, y: 0 }
      }],
      edits: [],
      comments: [],
      startedAt: new Date()
    };

    this.sessions.set(session.id, session);
    await hybridStorage.set(`collab-session-${session.id}`, session);
    console.log(`✅ Collaboration session started: ${session.id}`);

    return session;
  }

  async joinSession(sessionId: string, userId: string, email: string): Promise<CollaborationSession> {
    const session: CollaborationSession | undefined =
      this.sessions.get(sessionId) || (await hybridStorage.get(`collab-session-${sessionId}`));
    if (!session) throw new Error('Session not found');

    const existingParticipant = session.participants.find((p) => p.userId === userId);
    if (!existingParticipant) {
      session.participants.push({
        userId,
        email,
        joinedAt: new Date(),
        cursorPosition: { x: 0, y: 0 }
      });
    }

    this.sessions.set(sessionId, session);
    await hybridStorage.set(`collab-session-${sessionId}`, session);
    console.log(`✅ User joined session: ${userId}`);

    return session;
  }

  async broadcastEdit(sessionId: string, userId: string, edit: EditLog): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    edit.userId = userId;
    edit.timestamp = new Date();

    session.edits.push(edit);

    // Buffer edits for batch sync
    if (!this.editBuffer.has(sessionId)) {
      this.editBuffer.set(sessionId, []);
    }
    this.editBuffer.get(sessionId)!.push(edit);

    // Broadcast to other participants (simulated)
    console.log(`📝 Edit broadcasted: ${edit.action} on ${edit.target}`);

    // Auto-flush buffer every 5 seconds
    if (this.editBuffer.get(sessionId)!.length >= 10) {
      await this.flushEdits(sessionId);
    }
  }

  private async flushEdits(sessionId: string): Promise<void> {
    const edits = this.editBuffer.get(sessionId);
    if (!edits || edits.length === 0) return;

    const session = this.sessions.get(sessionId);
    if (session) {
      await hybridStorage.set(`collab-session-${sessionId}`, session);
      console.log(`💾 ${edits.length} edits flushed to storage`);
    }

    this.editBuffer.delete(sessionId);
  }

  async addComment(sessionId: string, userId: string, content: string, target: string): Promise<Comment> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      userId,
      content,
      replies: [],
      timestamp: new Date(),
      resolved: false
    };

    session.comments.push(comment);
    await hybridStorage.set(`collab-session-${sessionId}`, session);
    console.log(`💬 Comment added: ${comment.id}`);

    return comment;
  }

  async replyToComment(sessionId: string, commentId: string, userId: string, content: string): Promise<Comment> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const comment = this.findComment(session.comments, commentId);
    if (!comment) throw new Error('Comment not found');

    const reply: Comment = {
      id: `reply-${Date.now()}`,
      userId,
      content,
      replies: [],
      timestamp: new Date(),
      resolved: false
    };

    comment.replies.push(reply);
    await hybridStorage.set(`collab-session-${sessionId}`, session);
    console.log(`↩️ Reply added to comment: ${commentId}`);

    return reply;
  }

  private findComment(comments: Comment[], id: string): Comment | undefined {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      const found = this.findComment(comment.replies, id);
      if (found) return found;
    }
    return undefined;
  }

  async resolveComment(sessionId: string, commentId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const comment = this.findComment(session.comments, commentId);
    if (comment) {
      comment.resolved = true;
      await hybridStorage.set(`collab-session-${sessionId}`, session);
      console.log(`✅ Comment resolved: ${commentId}`);
    }
  }

  async updateCursorPosition(sessionId: string, userId: string, position: { x: number; y: number }): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.cursorPosition = position;
      // Broadcast cursor position to other participants (simulated)
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endedAt = new Date();
      await this.flushEdits(sessionId);
      await hybridStorage.set(`collab-session-${sessionId}`, session);
      this.sessions.delete(sessionId);
      console.log(`✅ Session ended: ${sessionId}`);
    }
  }

  async getSession(sessionId: string): Promise<CollaborationSession | null> {
    return this.sessions.get(sessionId) || await hybridStorage.get(`collab-session-${sessionId}`);
  }

  async getSessionEdits(sessionId: string, afterTimestamp?: Date): Promise<EditLog[]> {
    const session = await this.getSession(sessionId);
    if (!session) return [];

    return session.edits.filter(e => !afterTimestamp || e.timestamp > afterTimestamp);
  }

  async getSessionComments(sessionId: string): Promise<Comment[]> {
    const session = await this.getSession(sessionId);
    return session?.comments || [];
  }
}

export const realtimeCollaborationService = new RealtimeCollaborationService();
