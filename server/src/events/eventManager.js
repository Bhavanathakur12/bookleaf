/**
 * In-memory Real-Time Event Dispatcher (Server-Sent Events)
 */

class EventManager {
  constructor() {
    this.clients = new Set();
  }

  addClient(res, user) {
    const client = { res, user };
    this.clients.add(client);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE stream established' })}\n\n`);

    reqCloseHandler:
    res.on('close', () => {
      this.clients.delete(client);
    });
  }

  broadcast(eventType, payload, target = null) {
    const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      // If target author is specified, send to that author OR any admin
      if (target && target.authorId) {
        if (client.user.role === 'admin' || client.user.author_id === target.authorId) {
          client.res.write(`data: ${data}\n\n`);
        }
      } else {
        // Send to all matching clients
        client.res.write(`data: ${data}\n\n`);
      }
    }
  }
}

export const eventManager = new EventManager();
